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

// Calendar colour for a day. An office day without both clock times is "open" and shown dimmer.
export type Tone = 'none' | 'wfh' | 'leave' | 'office' | 'office-open'

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
  // Past weekdays in range with nothing recorded, oldest first.
  unmarked: string[]
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

export function isWeekend(key: string): boolean {
  const weekday = parseDateKey(key).getDay()
  return weekday === 0 || weekday === 6
}

// Leave days in a picked range. Weekends are skipped unless asked for, since they are not working days.
export function leaveDates(from: string, to: string, includeWeekends: boolean): string[] {
  const dates = eachDate(from, to)
  return includeWeekends ? dates : dates.filter((date) => !isWeekend(date))
}

export type LeaveSpan = { from: string; to: string; count: number; leaveType?: LeaveType; note?: string }

// A span continues across an empty weekend, so Fri + Mon off reads as one leave of 2 days.
function bridges(days: Days, lastTo: string, date: string): boolean {
  for (let cursor = addDays(lastTo, 1); cursor < date; cursor = addDays(cursor, 1)) {
    if (!isWeekend(cursor) || days[cursor]) return false
  }
  return true
}

export function leaveSpans(days: Days): LeaveSpan[] {
  const dates = Object.entries(days)
    .filter(([, day]) => day.kind === 'leave')
    .map(([date]) => date)
    .sort()
  const spans: LeaveSpan[] = []
  for (const date of dates) {
    const day = days[date]
    if (!day) continue
    const last = spans[spans.length - 1]
    const same =
      last &&
      bridges(days, last.to, date) &&
      last.leaveType === day.leaveType &&
      (last.note ?? '') === (day.note ?? '')
    if (last && same) {
      last.to = date
      last.count += 1
    } else {
      spans.push({
        from: date,
        to: date,
        count: 1,
        ...(day.leaveType ? { leaveType: day.leaveType } : {}),
        ...(day.note ? { note: day.note } : {}),
      })
    }
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
  return minutesBetween(day.in, day.out) == null ? 'office-open' : 'office'
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

// Weeks start on Monday so the weekend sits together at the end of each row.
export function monthCells(year: number, monthIndex: number): (string | null)[] {
  const first = new Date(year, monthIndex, 1)
  const count = new Date(year, monthIndex + 1, 0).getDate()
  const cells: (string | null)[] = Array.from({ length: (first.getDay() + 6) % 7 }, () => null)
  for (let day = 1; day <= count; day += 1) cells.push(dateKey(new Date(year, monthIndex, day)))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function weekOf(key: string): string[] {
  const monday = addDays(key, -((parseDateKey(key).getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
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
    unmarked: [],
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
    if (isWeekend(cursor)) continue
    summary.weekdays += 1
    if (days[cursor]) summary.weekdaysMarked += 1
    else summary.unmarked.push(cursor)
  }
  return summary
}

export function formatShort(key: string): string {
  return parseDateKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatRange(from: string, to: string): string {
  return from === to ? formatLong(from) : `${formatShort(from)} – ${formatLong(to)}`
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

// One line describing a day, used by lists and shared reports.
export function describeDay(day: Day): string {
  if (day.kind === 'wfh') return 'Work from home'
  if (day.kind === 'leave') return leaveLabel(day.leaveType)
  const mins = minutesBetween(day.in, day.out)
  if (day.in && day.out) return `Office ${day.in}–${day.out}${mins == null ? '' : ` (${formatMinutes(mins)})`}`
  if (day.in) return `Office from ${day.in}`
  return 'Office'
}

export function monthReport(days: Days, year: number, monthIndex: number, today: string): string {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  const summary = summarize(days, { today, prefix })
  const lines = [
    `Attendance · ${formatMonth(year, monthIndex)}`,
    `Office ${summary.office} (${formatMinutes(summary.minutes)}) · Home ${summary.wfh} · Leave ${summary.leave}`,
    `Weekdays logged ${summary.weekdaysMarked} of ${summary.weekdays}`,
    '',
  ]
  const keys = Object.keys(days).filter((key) => key.startsWith(prefix)).sort()
  if (keys.length === 0) lines.push('Nothing recorded.')
  for (const key of keys) {
    const day = days[key]
    lines.push(`${formatShort(key)} · ${describeDay(day)}${day.note ? ` — ${day.note}` : ''}`)
  }
  return lines.join('\n')
}

// Everything someone might ask about a year: totals, each month, and every leave with its reason.
export function yearReport(days: Days, year: number, today: string): string {
  const prefix = String(year)
  const summary = summarize(days, { today, prefix })
  const counts = leaveCounts(days, prefix)
  const lines = [
    `Attendance · ${year}`,
    `Office ${summary.office} (${formatMinutes(summary.minutes)}) · Home ${summary.wfh} · Leave ${summary.leave}`,
    `Weekdays logged ${summary.weekdaysMarked} of ${summary.weekdays}`,
    '',
    'By month',
  ]
  for (let index = 0; index < 12; index += 1) {
    const month = summarize(days, { today, prefix: `${prefix}-${String(index + 1).padStart(2, '0')}` })
    if (month.office + month.wfh + month.leave === 0) continue
    lines.push(
      `${formatMonth(year, index)}: office ${month.office} (${formatMinutes(month.minutes)}) · home ${month.wfh} · leave ${month.leave}`,
    )
  }
  const parts = leaveTypes.filter((item) => counts[item.id] > 0).map((item) => `${item.label} ${counts[item.id]}`)
  if (counts.unmarked > 0) parts.push(`Leave ${counts.unmarked}`)
  lines.push('', `Leave${parts.length ? ` · ${parts.join(' · ')}` : ''}`)
  const spans = leaveSpans(days).filter((span) => span.from.startsWith(prefix) || span.to.startsWith(prefix))
  if (spans.length === 0) lines.push('No leave taken.')
  for (const span of spans) {
    lines.push(
      `${formatRange(span.from, span.to)} · ${leaveLabel(span.leaveType)} · ${plural(span.count, 'day')}${span.note ? ` — ${span.note}` : ''}`,
    )
  }
  return lines.join('\n')
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

// Spreadsheet export: one row per recorded day, oldest first.
export function toCsv(days: Days): string {
  const rows = [['date', 'weekday', 'type', 'leave_type', 'in', 'out', 'minutes', 'note']]
  for (const key of Object.keys(days).sort()) {
    const day = days[key]
    const mins = day.kind === 'office' ? minutesBetween(day.in, day.out) : null
    rows.push([
      key,
      parseDateKey(key).toLocaleDateString('en-US', { weekday: 'short' }),
      day.kind,
      day.kind === 'leave' ? (day.leaveType ?? '') : '',
      day.kind === 'office' ? (day.in ?? '') : '',
      day.kind === 'office' ? (day.out ?? '') : '',
      mins == null ? '' : String(mins),
      day.note ?? '',
    ])
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}
