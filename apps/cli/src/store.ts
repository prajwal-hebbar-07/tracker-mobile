import { cleanDay, cleanDays, isDateKey, type Day, type Days } from '@logbook/core'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export class UnreadableLog extends Error {
  constructor(file: string) {
    super(`The log at ${file} is not readable, so it was left as it is. Restore a backup to replace it.`)
  }
}

// A missing file is an empty log; a file that is not a log throws, so nothing ever overwrites it.
export async function readLog(file: string): Promise<Days> {
  let raw: string
  try {
    raw = await readFile(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new UnreadableLog(file)
  }
  const days = cleanDays(parsed)
  if (!days) throw new UnreadableLog(file)
  return days
}

// Temporary file + rename, so a crash mid-write never leaves half a log. The pid keeps it apart from the widget's.
async function writeLog(file: string, days: Days): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(days))
  await rename(tmp, file)
}

// Re-reads the file right before writing, so a change the widget made in the meantime is kept.
// All the changes land in one write: a range of leave is never half saved.
export async function setDays(file: string, changes: Record<string, Day | null>): Promise<Days> {
  const entries = Object.entries(changes)
  const cleaned = entries.map(([date, day]) => {
    if (!isDateKey(date)) throw new Error(`${date} is not a date. Use YYYY-MM-DD.`)
    if (!day) return [date, null] as const
    const valid = cleanDay(day)
    if (!valid) throw new Error('That day is not valid.')
    return [date, valid] as const
  })
  const days = await readLog(file)
  for (const [date, day] of cleaned) {
    if (day) days[date] = day
    else delete days[date]
  }
  await writeLog(file, days)
  return days
}

export function setDay(file: string, date: string, day: Day | null): Promise<Days> {
  return setDays(file, { [date]: day })
}

// Restore: replaces everything, including a log that could not be read.
export function replaceLog(file: string, days: Days): Promise<void> {
  return writeLog(file, days)
}
