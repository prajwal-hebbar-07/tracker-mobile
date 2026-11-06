import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, test } from 'node:test'
import { compareVersions, pickRelease, selfUpdate } from './update.ts'

const release = (tag: string, extra: Partial<{ draft: boolean; prerelease: boolean; asset: string; digest: string }> = {}) => ({
  tag_name: tag,
  draft: extra.draft ?? false,
  prerelease: extra.prerelease ?? false,
  assets: [{ name: extra.asset ?? 'logbook.mjs', browser_download_url: `https://example.test/${tag}`, digest: extra.digest ?? null }],
})

test('versions compare by number, not text', () => {
  assert.equal(compareVersions('1.10.0', '1.9.0'), 1)
  assert.equal(compareVersions('1.2.0', '1.2.0'), 0)
  assert.equal(compareVersions('0.9.9', '1.0.0'), -1)
})

test('only published CLI releases with the tool attached count as updates', () => {
  const picked = pickRelease([
    release('v1.1.0-7', { asset: 'logbook-1.1.0-7.apk' }),
    release('cli-v2.0.0', { draft: true }),
    release('cli-v1.3.0', { prerelease: true }),
    release('cli-v1.10.0', { digest: 'sha256:abc123' }),
    release('cli-v1.9.0'),
    release('cli-v1.11.0', { asset: 'notes.txt' }),
  ])
  assert.deepEqual(picked, { version: '1.10.0', url: 'https://example.test/cli-v1.10.0', sha256: 'abc123' })
  assert.equal(pickRelease([release('v1.1.0-3', { asset: 'app.apk' })]), null)
})

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

// GitHub answers the release list, then the asset download.
function fakeGitHub(asset: string, digest: string) {
  globalThis.fetch = (async (url: string | URL | Request) =>
    String(url).includes('/releases?')
      ? Response.json([release('cli-v1.2.0', { digest: `sha256:${digest}` })])
      : new Response(asset)) as typeof fetch
}

async function installed() {
  const file = join(await mkdtemp(join(tmpdir(), 'logbook-cli-')), 'logbook.mjs')
  await writeFile(file, 'old', { mode: 0o755 })
  return file
}

test('an update replaces the installed file and keeps it executable', async () => {
  const file = await installed()
  fakeGitHub('new', createHash('sha256').update('new').digest('hex'))
  assert.equal(await selfUpdate('1.0.0', file), 'Updated 1.0.0 → 1.2.0.')
  assert.equal(await readFile(file, 'utf8'), 'new')
  assert.equal((await stat(file)).mode & 0o777, 0o755)
  assert.equal(await selfUpdate('1.2.0', file), 'Already up to date (1.2.0).')
})

test('a download that does not match the release checksum replaces nothing', async () => {
  const file = await installed()
  fakeGitHub('tampered', createHash('sha256').update('new').digest('hex'))
  await assert.rejects(selfUpdate('1.0.0', file), /checksum/)
  assert.equal(await readFile(file, 'utf8'), 'old')
})
