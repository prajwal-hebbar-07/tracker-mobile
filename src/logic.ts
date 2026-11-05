export type Kind = 'office' | 'wfh' | 'leave'

export type LeaveType = 'personal' | 'sick' | 'early' | 'lop'

export const leaveTypes: { id: LeaveType; label: string }[] = [
  { id: 'personal', label: 'Personal leave' },
  { id: 'early', label: 'Early leave' },
  { id: 'sick', label: 'Sick leave' },
  { id: 'lop', label: 'Loss of pay' },
]

export function leaveLabel(type?: LeaveType): string {
  return leaveTypes.find((item) => item.id === type)?.label ?? 'Leave'
}

export function leaveCounts(days: Days, prefix?: string): Record<LeaveType | 'unmarked', number> {
  const counts = { personal: 0, early: 0, sick: 0, lop: 0, unmarked: 0 }
  for (const [date, day] of Object.entries(days)) {
    if (prefix && !date.startsWith(prefix)) continue
    if (day.kind !== 'leave') continue
    if (day.leaveType) counts[day.leaveType] += 1
    else counts.unmarked += 1
  }
  return counts
}

export type Day = {
  kind: Kind
  in?: string
  out?: string
  note?: string
  leaveType?: LeaveType
}

export type Days = Record<string, Day>

export type Tone =
  | 'none'
  | 'wfh'
  | 'leave'
  | 'office-open'
  | 'office-short'
  | 'office-mid'
  | 'office-full'

export type Summary = {
  office: number
  wfh: number
  leave: number
  minutes: number
  officeWithHours: number
  officeMissing: number
  weekdays: number
  weekdaysMarked: number
  months: number[]
  leaves: string[]
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return dateKey(parseDateKey(value)) === value
}

export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function todayKey(now = new Date()): string {
  return dateKey(now)
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(key: string, amount: number): string {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + amount)
  return dateKey(date)
}

export function timeNow(now = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function formatLong(key: string): string {
  return parseDateKey(key).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatMonth(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function formatMinutes(mins: number | null): string {
  if (mins == null) return '—'
  const hours = Math.floor(mins / 60)
  const minutes = mins % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

export function normalizeTime(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function eachDate(from: string, to: string): string[] {
  const start = from <= to ? from : to
  const end = from <= to ? to : from
  const dates: string[] = []
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) dates.push(cursor)
  return dates
}

export function leaveSpans(days: Days): { from: string; to: string; leaveType?: LeaveType; note?: string }[] {
  const dates = Object.entries(days)
    .filter(([, day]) => day.kind === 'leave')
    .map(([date]) => date)
    .sort()
  const spans: { from: string; to: string; leaveType?: LeaveType; note?: string }[] = []
  for (const date of dates) {
    const day = days[date]
    if (!day) continue
    const last = spans[spans.length - 1]
    const same =
      last &&
      addDays(last.to, 1) === date &&
      last.leaveType === day.leaveType &&
      (last.note ?? '') === (day.note ?? '')
    if (last && same) last.to = date
    else spans.push({ from: date, to: date, ...(day.leaveType ? { leaveType: day.leaveType } : {}), ...(day.note ? { note: day.note } : {}) })
  }
  return spans
}

export function minutesSince(inn: string, now: Date): number | null {
  const start = normalizeTime(inn)
  if (!start) return null
  const [hours, minutes] = start.split(':').map(Number)
  const clock = new Date(now)
  clock.setHours(hours, minutes, 0, 0)
  const delta = Math.floor((now.getTime() - clock.getTime()) / 60000)
  if (delta < 0) return null
  return delta
}

export function minutesBetween(inn?: string, out?: string): number | null {
  const start = inn ? normalizeTime(inn) : null
  const end = out ? normalizeTime(out) : null
  if (!start || !end) return null
  const [startHour, startMinute] = start.split(':').map(Number)
  const [endHour, endMinute] = end.split(':').map(Number)
  const delta = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  if (delta < 0) return null
  return delta
}

export function tone(day: Day | null): Tone {
  if (!day) return 'none'
  if (day.kind === 'wfh') return 'wfh'
  if (day.kind === 'leave') return 'leave'
  const mins = minutesBetween(day.in, day.out)
  if (mins == null) return 'office-open'
  if (mins < 240) return 'office-short'
  if (mins < 480) return 'office-mid'
  return 'office-full'
}

export function cleanDay(value: unknown): Day | null {
  if (typeof value !== 'object' || value == null) return null
  const record = value as Record<string, unknown>
  if (record.kind !== 'office' && record.kind !== 'wfh' && record.kind !== 'leave') return null
  const day: Day = { kind: record.kind }
  if (typeof record.in === 'string') {
    const inn = normalizeTime(record.in)
    if (inn) day.in = inn
  }
  if (typeof record.out === 'string') {
    const out = normalizeTime(record.out)
    if (out) day.out = out
  }
  if (typeof record.note === 'string') {
    const note = record.note.trim().slice(0, 280)
    if (note) day.note = note
  }
  if (day.kind === 'leave' && leaveTypes.some((item) => item.id === record.leaveType)) {
    day.leaveType = record.leaveType as LeaveType
  }
  return day
}

// null means the blob is not a log, so the caller must not overwrite storage.
export function cleanDays(value: unknown): Days | null {
  if (typeof value !== 'object' || value == null || Array.isArray(value)) return null
  const days: Days = {}
  for (const [date, raw] of Object.entries(value)) {
    if (!isDateKey(date)) continue
    const day = cleanDay(raw)
    if (day) days[date] = day
  }
  return days
}

export function monthCells(year: number, monthIndex: number): (string | null)[] {
  const first = new Date(year, monthIndex, 1)
  const count = new Date(year, monthIndex + 1, 0).getDate()
  const cells: (string | null)[] = Array.from({ length: first.getDay() }, () => null)
  for (let day = 1; day <= count; day += 1) cells.push(dateKey(new Date(year, monthIndex, day)))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function rangeFor(prefix: string | undefined, today: string, days: Days): { from: string; to: string } | null {
  if (!prefix) {
    const keys = Object.keys(days).sort()
    const from = keys[0] && keys[0] < today ? keys[0] : today
    return { from, to: today }
  }
  if (/^\d{4}$/.test(prefix)) {
    const from = `${prefix}-01-01`
    const end = `${prefix}-12-31`
    const to = end < today ? end : today
    return to < from ? null : { from, to }
  }
  if (/^\d{4}-\d{2}$/.test(prefix)) {
    const [year, month] = prefix.split('-').map(Number)
    const from = `${prefix}-01`
    const end = dateKey(new Date(year, month, 0))
    const to = end < today ? end : today
    return to < from ? null : { from, to }
  }
  return null
}

export function summarize(days: Days, opts: { today: string; prefix?: string }): Summary {
  const summary: Summary = {
    office: 0,
    wfh: 0,
    leave: 0,
    minutes: 0,
    officeWithHours: 0,
    officeMissing: 0,
    weekdays: 0,
    weekdaysMarked: 0,
    months: Array.from({ length: 12 }, () => 0),
    leaves: [],
  }

  for (const [date, day] of Object.entries(days)) {
    if (opts.prefix && !date.startsWith(opts.prefix)) continue
    if (day.kind === 'wfh') summary.wfh += 1
    else if (day.kind === 'leave') {
      summary.leave += 1
      summary.leaves.push(date)
    } else {
      summary.office += 1
      const mins = minutesBetween(day.in, day.out)
      if (mins == null) summary.officeMissing += 1
      else {
        summary.officeWithHours += 1
        summary.minutes += mins
        summary.months[Number(date.slice(5, 7)) - 1] += mins
      }
    }
  }

  summary.leaves.sort()
  const range = rangeFor(opts.prefix, opts.today, days)
  if (!range) return summary
  for (let cursor = range.from; cursor <= range.to; cursor = addDays(cursor, 1)) {
    const weekday = parseDateKey(cursor).getDay()
    if (weekday === 0 || weekday === 6) continue
    summary.weekdays += 1
    if (days[cursor]) summary.weekdaysMarked += 1
  }
  return summary
}
