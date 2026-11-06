import type { Day } from '@logbook/core'
import { invoke } from '@tauri-apps/api/core'

// Inside the Tauri app these go to the Rust commands in src-tauri/src/main.rs.
// `npm run web` opens the same page in a browser for layout work; there the log lives in localStorage.
const inApp = '__TAURI_INTERNALS__' in window
const browserKey = 'logbook.days.v1'

export const canQuit = inApp

// null means there is no log yet.
export function loadLog(): Promise<string | null> {
  if (!inApp) return Promise.resolve(localStorage.getItem(browserKey))
  return invoke<string | null>('load_days')
}

// Replaces the whole log (restore).
export async function saveLog(json: string): Promise<void> {
  if (!inApp) return localStorage.setItem(browserKey, json)
  await invoke('save_days', { json })
}

// Changes one day against the file as it is now and returns the log as written, so edits from the CLI survive.
export async function updateDay(date: string, day: Day | null): Promise<string> {
  if (inApp) return invoke<string>('update_day', { date, day })
  const log = JSON.parse(localStorage.getItem(browserKey) ?? '{}') as Record<string, Day>
  if (day) log[date] = day
  else delete log[date]
  const json = JSON.stringify(log)
  localStorage.setItem(browserKey, json)
  return json
}

// Asks where to save. false means the save panel was cancelled.
export async function saveFile(name: string, bytes: Uint8Array): Promise<boolean> {
  if (inApp) return invoke<boolean>('save_file', { name, contents: Array.from(bytes) })
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>]))
  const link = Object.assign(document.createElement('a'), { href: url, download: name })
  link.click()
  URL.revokeObjectURL(url)
  return true
}

// The text of a picked backup file, or null when nothing was picked.
export function openBackup(): Promise<string | null> {
  if (inApp) return invoke<string | null>('open_backup')
  const { promise, resolve } = Promise.withResolvers<string | null>()
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,.txt' })
  input.onchange = () => {
    const file = input.files?.[0]
    if (file) file.text().then(resolve, () => resolve(null))
    else resolve(null)
  }
  input.oncancel = () => resolve(null)
  input.click()
  return promise
}

export function quit(): void {
  if (inApp) void invoke('quit')
}

// The newer version on the widget's release feed, or null. Never offered in the browser preview.
export function checkUpdate(): Promise<string | null> {
  if (!inApp) return Promise.resolve(null)
  return invoke<string | null>('check_update')
}

// Downloads, verifies and installs the update, then restarts the widget.
export async function installUpdate(): Promise<void> {
  if (inApp) await invoke('install_update')
}
