import type { Cell, Sheet } from './xlsx'

export type Kind = 'office' | 'wfh' | 'leave' | 'holiday'

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
  // On an office or home day: the date is a holiday that was worked anyway. A holiday's name is its note.
  holiday?: true
  // On an office or home day: its notes, what was worked on, with links (pull requests, commits) as proof. A worked
  // holiday's log (weekends included) is made of these.
  work?: string
  links?: string[]
}

// A web link as typed, or null. A pattern rather than `URL`, which React Native only partly implements.
export function cleanLink(value: string): string | null {
  const link = value.trim()
  return link.length <= 500 && /^https?:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#]\S*)?$/i.test(link) ? link : null
}

export type Days = Record<string, Day>

// Calendar colour for a day. An office day without both clock times is "open" and shown dimmer.
export type Tone = 'none' | 'wfh' | 'leave' | 'holiday' | 'office' | 'office-open'

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
  // Days off for a holiday in the whole period, future ones included: marked holidays and weekends with nothing logged.
  holiday: number
  // Office and home days on a weekend or a marked holiday.
  workedHolidays: number
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

// Weekends are holidays, and so is any day marked as one, worked or not.
export function isHoliday(key: string, day?: Day | null): boolean {
  return isWeekend(key) || day?.kind === 'holiday' || day?.holiday === true
}

// An office or home day on a holiday: it counts as worked, and is still shown as a holiday.
export function workedHoliday(key: string, day?: Day | null): boolean {
  return (day?.kind === 'office' || day?.kind === 'wfh') && isHoliday(key, day)
}

// Leave days in a picked range. Marked holidays are always skipped, and weekends unless asked for, since neither is a
// working day.
export function leaveDates(days: Days, from: string, to: string, includeWeekends: boolean): string[] {
  return eachDate(from, to).filter((date) => days[date]?.kind !== 'holiday' && (includeWeekends || !isWeekend(date)))
}

export type LeaveSpan = { from: string; to: string; count: number; leaveType?: LeaveType; note?: string }

// A span continues across an empty weekend or a holiday, so Fri + Mon off reads as one leave of 2 days.
function bridges(days: Days, lastTo: string, date: string): boolean {
  for (let cursor = addDays(lastTo, 1); cursor < date; cursor = addDays(cursor, 1)) {
    const day = days[cursor]
    if (day ? day.kind !== 'holiday' : !isWeekend(cursor)) return false
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
  if (day.kind === 'holiday') return 'holiday'
  return minutesBetween(day.in, day.out) == null ? 'office-open' : 'office'
}

export function cleanDay(value: unknown): Day | null {
  if (typeof value !== 'object' || value == null) return null
  const record = value as Record<string, unknown>
  if (record.kind !== 'office' && record.kind !== 'wfh' && record.kind !== 'leave' && record.kind !== 'holiday') return null
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
  if (day.kind === 'office' || day.kind === 'wfh') {
    if (record.holiday === true) day.holiday = true
    if (typeof record.work === 'string') {
      const work = record.work.trim().slice(0, 1000)
      if (work) day.work = work
    }
    if (Array.isArray(record.links)) {
      const links = [...new Set(record.links.flatMap((link) => (typeof link === 'string' ? (cleanLink(link) ?? []) : [])))]
      if (links.length) day.links = links.slice(0, 20)
    }
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

// The whole month or year `prefix` names; without one, the log's first day (or today) to its last (or today).
function periodFor(prefix: string | undefined, today: string, days: Days): { from: string; to: string } | null {
  if (!prefix) {
    const keys = Object.keys(days).sort()
    const first = keys[0]
    const last = keys[keys.length - 1]
    return { from: first && first < today ? first : today, to: last && last > today ? last : today }
  }
  if (/^\d{4}$/.test(prefix)) return { from: `${prefix}-01-01`, to: `${prefix}-12-31` }
  if (/^\d{4}-\d{2}$/.test(prefix)) {
    const [year, month] = prefix.split('-').map(Number)
    return { from: `${prefix}-01`, to: dateKey(new Date(year, month, 0)) }
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
    holiday: 0,
    workedHolidays: 0,
  }

  for (const [date, day] of Object.entries(days)) {
    if (opts.prefix && !date.startsWith(opts.prefix)) continue
    if (workedHoliday(date, day)) summary.workedHolidays += 1
    if (day.kind === 'wfh') summary.wfh += 1
    else if (day.kind === 'leave') {
      summary.leave += 1
      summary.leaves.push(date)
    } else if (day.kind === 'office') {
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
  const period = periodFor(opts.prefix, opts.today, days)
  if (!period) return summary
  // Weekdays only count up to today, and a holiday is not one even when it was worked.
  for (let cursor = period.from; cursor <= period.to; cursor = addDays(cursor, 1)) {
    const day = days[cursor]
    if (day ? day.kind === 'holiday' : isWeekend(cursor)) summary.holiday += 1
    if (cursor > opts.today || isHoliday(cursor, day)) continue
    summary.weekdays += 1
    if (day) summary.weekdaysMarked += 1
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

// One line describing a day, used by lists and shared reports. A holiday's name is its note, shown beside this.
export function describeDay(day: Day): string {
  if (day.kind === 'holiday') return 'Holiday'
  if (day.kind === 'leave') return leaveLabel(day.leaveType)
  const on = day.holiday ? ' on a holiday' : ''
  if (day.kind === 'wfh') return `Work from home${on}`
  const mins = minutesBetween(day.in, day.out)
  if (day.in && day.out) return `Office ${day.in}–${day.out}${mins == null ? '' : ` (${formatMinutes(mins)})`}${on}`
  if (day.in) return `Office from ${day.in}${on}`
  return `Office${on}`
}

// "Holidays 10", and how many were worked when any were.
function holidayLine(summary: Summary): string {
  return `Holidays ${summary.holiday}${summary.workedHolidays ? ` · worked on ${plural(summary.workedHolidays, 'holiday')}` : ''}`
}

// Worked holidays in `prefix` (a year or a month), oldest first: the days whose work log is the proof.
export function workedHolidayDates(days: Days, prefix: string): string[] {
  return Object.keys(days)
    .filter((date) => date.startsWith(prefix) && workedHoliday(date, days[date]))
    .sort()
}

// A worked day's work log, indented under its line in the reports.
function workLines(day: Day): string[] {
  return [...(day.work ? [`  Worked on: ${day.work}`] : []), ...(day.links ?? []).map((link) => `  ${link}`)]
}

export function monthReport(days: Days, year: number, monthIndex: number, today: string): string {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  const summary = summarize(days, { today, prefix })
  const lines = [
    `Attendance · ${formatMonth(year, monthIndex)}`,
    `Office ${summary.office} (${formatMinutes(summary.minutes)}) · Home ${summary.wfh} · Leave ${summary.leave}`,
    holidayLine(summary),
    `Weekdays logged ${summary.weekdaysMarked} of ${summary.weekdays}`,
    '',
  ]
  const keys = Object.keys(days).filter((key) => key.startsWith(prefix)).sort()
  if (keys.length === 0) lines.push('Nothing recorded.')
  for (const key of keys) {
    const day = days[key]
    lines.push(`${formatShort(key)} · ${describeDay(day)}${day.note ? ` — ${day.note}` : ''}`, ...workLines(day))
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
    holidayLine(summary),
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
  const worked = workedHolidayDates(days, prefix)
  if (worked.length > 0) lines.push('', 'Worked holidays')
  for (const date of worked) {
    const day = days[date]
    lines.push(`${formatShort(date)} · ${describeDay(day)}${day.holiday && day.note ? ` — ${day.note}` : ''}`, ...workLines(day))
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

export type ExcelOptions = {
  from: number
  years: number
  // Off drops empty Saturdays and Sundays; a weekend day with something logged always stays.
  weekends: boolean
  // One sheet per year, or every year on a single sheet.
  split: boolean
}

export const maxExcelYears = 10

export function excelYears(options: ExcelOptions): number[] {
  return Array.from({ length: options.years }, (_, index) => options.from + index)
}

export function excelLabel(options: ExcelOptions): string {
  const years = excelYears(options)
  return years.length === 1 ? String(years[0]) : `${years[0]}–${years[years.length - 1]}`
}

function excelDate(key: string): number {
  const [year, month, day] = key.split('-').map(Number)
  return (Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86400000
}

function excelTime(value?: string): Cell {
  const time = value ? normalizeTime(value) : null
  if (!time) return null
  const [hours, minutes] = time.split(':').map(Number)
  return { value: (hours * 60 + minutes) / 1440, format: 'time' }
}

const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const statusNames: Record<Kind, string> = { office: 'Office', wfh: 'Home', leave: 'Leave', holiday: 'Holiday' }

// An empty past weekday reads "Not logged"; an empty day still to come stays blank. A worked holiday says so, and a
// day with a work log gets two more cells: what was worked on, and its links.
function excelRow(date: string, day: Day | undefined, today: string): Cell[] {
  const start: Cell[] = [{ value: excelDate(date), format: 'date' }, weekdayNames[parseDateKey(date).getDay()]]
  if (!day) return [...start, isWeekend(date) ? 'Weekend' : date < today ? 'Not logged' : null]
  const status = `${statusNames[day.kind]}${workedHoliday(date, day) ? ' (holiday)' : ''}`
  const leaveType = day.kind === 'leave' ? (leaveTypes.find((item) => item.id === day.leaveType)?.label ?? null) : null
  const office = day.kind === 'office'
  const mins = office ? minutesBetween(day.in, day.out) : null
  return [
    ...start,
    status,
    leaveType,
    office ? excelTime(day.in) : null,
    office ? excelTime(day.out) : null,
    mins == null ? null : { value: mins / 1440, format: 'duration' },
    day.note ?? null,
    ...(day.work || day.links ? [day.work ?? null, day.links?.join(' ') ?? null] : []),
  ]
}

const excelHeader = ['Date', 'Day', 'Status', 'Leave type', 'In', 'Out', 'Hours', 'Note', 'Worked on', 'Links']
const excelWidths = [12, 6, 16, 16, 8, 8, 8, 48, 48, 60]

function excelRows(days: Days, from: string, to: string, weekends: boolean, today: string): Cell[][] {
  return eachDate(from, to)
    .filter((date) => weekends || !isWeekend(date) || days[date])
    .map((date) => excelRow(date, days[date], today))
}

function yearRows(days: Days, year: number, options: ExcelOptions, today: string): Cell[][] {
  return excelRows(days, `${year}-01-01`, `${year}-12-31`, options.weekends, today)
}

// Every calendar day of each chosen year gets a row, logged or not.
export function excelSheets(days: Days, options: ExcelOptions, today: string): Sheet[] {
  const years = excelYears(options)
  if (options.split) {
    return years.map((year) => ({
      name: String(year),
      header: excelHeader,
      widths: excelWidths,
      rows: yearRows(days, year, options, today),
    }))
  }
  const rows = years.flatMap((year) => yearRows(days, year, options, today))
  return [{ name: excelLabel(options).replace('–', '-'), header: excelHeader, widths: excelWidths, rows }]
}

// The same sheet as the year export, for every day of one month.
export function excelMonthSheet(days: Days, year: number, monthIndex: number, today: string): Sheet {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  const last = dateKey(new Date(year, monthIndex + 1, 0))
  return { name: prefix, header: excelHeader, widths: excelWidths, rows: excelRows(days, `${prefix}-01`, last, true, today) }
}
