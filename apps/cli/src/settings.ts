import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export type Settings = { vim: boolean }

const defaults: Settings = { vim: false }

// A missing or unreadable file means the defaults, so a broken preferences file never stops the CLI from starting.
export async function readSettings(file: string): Promise<Settings> {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, 'utf8'))
    const vim = (parsed as { vim?: unknown } | null)?.vim
    return { vim: typeof vim === 'boolean' ? vim : defaults.vim }
  } catch {
    return { ...defaults }
  }
}

export async function writeSettings(file: string, settings: Settings): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(settings))
  await rename(tmp, file)
}
