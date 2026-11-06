import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { defaultTheme, findTheme } from './theme.ts'

export type Settings = { vim: boolean; theme: string }

const defaults: Settings = { vim: false, theme: defaultTheme }

// A missing or unreadable file means the defaults, so a broken preferences file never stops the CLI from starting.
// Each field falls back on its own, and a theme this version does not know becomes the default.
export async function readSettings(file: string): Promise<Settings> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return { ...defaults }
  }
  const { vim, theme } = (parsed ?? {}) as { vim?: unknown; theme?: unknown }
  return {
    vim: typeof vim === 'boolean' ? vim : defaults.vim,
    theme: typeof theme === 'string' && findTheme(theme) ? theme : defaults.theme,
  }
}

export async function writeSettings(file: string, settings: Settings): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(settings))
  await rename(tmp, file)
}
