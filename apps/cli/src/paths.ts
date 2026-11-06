import { homedir } from 'node:os'
import { join } from 'node:path'

// The Mac widget's identifier. Its Tauri data folder holds the log, so the widget and the CLI share one file.
const widgetId = 'works.oni.logbook.widget'

// LOGBOOK_FILE points at another log (tests, or a log kept elsewhere).
export function logFile(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): string {
  if (env.LOGBOOK_FILE) return env.LOGBOOK_FILE
  const home = homedir()
  if (platform === 'darwin') return join(home, 'Library', 'Application Support', widgetId, 'days.json')
  return join(env.XDG_DATA_HOME || join(home, '.local', 'share'), widgetId, 'days.json')
}

// Where the daily update check remembers what it found.
export function cacheDir(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): string {
  const home = homedir()
  if (platform === 'darwin') return join(home, 'Library', 'Caches', 'logbook-cli')
  return join(env.XDG_CACHE_HOME || join(home, '.cache'), 'logbook-cli')
}
