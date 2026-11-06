import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { cacheDir } from './paths.ts'

export const repo = 'prajwal-hebbar-07/tracker-mobile'
// CLI releases are tagged cli-v1.2.3, apart from the APK's v1.1.0-3 releases in the same repo.
const tagPrefix = 'cli-v'
const assetName = 'logbook.mjs'
const day = 24 * 60 * 60 * 1000

export type Release = { version: string; url: string; sha256?: string }

type GitHubRelease = {
  tag_name: string
  draft: boolean
  prerelease: boolean
  assets: { name: string; browser_download_url: string; digest?: string | null }[]
}

// Numeric comparison of x.y.z, so 1.10.0 is newer than 1.9.0.
export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let index = 0; index < 3; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0)
    if (delta !== 0) return Math.sign(delta)
  }
  return 0
}

// The newest published CLI release that carries the bundled tool.
export function pickRelease(releases: GitHubRelease[]): Release | null {
  let best: Release | null = null
  for (const release of releases) {
    if (release.draft || release.prerelease || !release.tag_name.startsWith(tagPrefix)) continue
    const asset = release.assets.find((item) => item.name === assetName)
    const version = release.tag_name.slice(tagPrefix.length)
    if (!asset || !/^\d+\.\d+\.\d+$/.test(version)) continue
    if (best && compareVersions(version, best.version) <= 0) continue
    const sha256 = asset.digest?.startsWith('sha256:') ? asset.digest.slice('sha256:'.length) : undefined
    best = { version, url: asset.browser_download_url, ...(sha256 ? { sha256 } : {}) }
  }
  return best
}

export async function fetchLatest(signal?: AbortSignal): Promise<Release | null> {
  const response = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=50`, {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'logbook-cli' },
    signal,
  })
  if (!response.ok) throw new Error(`GitHub answered ${response.status}.`)
  return pickRelease((await response.json()) as GitHubRelease[])
}

type Cache = { checkedAt: number; latest: string | null }
const cacheFile = () => join(cacheDir(), 'update.json')

async function readCache(): Promise<Cache | null> {
  try {
    return JSON.parse(await readFile(cacheFile(), 'utf8')) as Cache
  } catch {
    return null
  }
}

// Called by the hidden `__check-update` command in a detached process, so no command ever waits on the network.
export async function refreshCache(): Promise<void> {
  const latest = await fetchLatest(AbortSignal.timeout(10_000))
  await mkdir(cacheDir(), { recursive: true })
  await writeFile(cacheFile(), JSON.stringify({ checkedAt: Date.now(), latest: latest?.version ?? null }))
}

// The newer version found by the last check, if any. Starts a fresh check in the background once a day.
export async function pendingUpdate(current: string, env: NodeJS.ProcessEnv = process.env): Promise<string | null> {
  if (env.LOGBOOK_NO_UPDATE_CHECK || env.CI) return null
  const cache = await readCache()
  if (!cache || Date.now() - cache.checkedAt > day) {
    spawn(process.execPath, [process.argv[1], '__check-update'], { detached: true, stdio: 'ignore' }).unref()
  }
  return cache?.latest && compareVersions(cache.latest, current) > 0 ? cache.latest : null
}

// Downloads the newest release over `target` (the running file). The release's SHA-256 digest is checked when
// GitHub gives one. The update cache needs no change: the new version is no longer older than what it found.
export async function selfUpdate(current: string, target: string = process.argv[1]): Promise<string> {
  const latest = await fetchLatest(AbortSignal.timeout(20_000))
  if (!latest) return 'No CLI release found on GitHub yet.'
  if (compareVersions(latest.version, current) <= 0) return `Already up to date (${current}).`
  const response = await fetch(latest.url, { signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new Error(`Download failed: GitHub answered ${response.status}.`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (latest.sha256 && createHash('sha256').update(bytes).digest('hex') !== latest.sha256) {
    throw new Error('The download does not match the release checksum, so nothing was replaced.')
  }
  const self = await realpath(target)
  const tmp = `${self}.${process.pid}.tmp`
  await writeFile(tmp, bytes, { mode: (await stat(self)).mode })
  await rename(tmp, self)
  return `Updated ${current} → ${latest.version}.`
}
