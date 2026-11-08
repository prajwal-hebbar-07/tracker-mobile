import {
  cleanLink,
  describeDay,
  formatRange,
  formatShort,
  leaveLabel,
  normalizeTime,
  plural,
  workedHoliday,
  type Day,
  type Days,
  type LeaveType,
} from '@logbook/core'

// The phone's rules, shared by the commands and the interactive view: clock in, clock out and work from
// home only happen today; any day can take leave or be a holiday; office and home days are only undone from today.
// Working on a holiday keeps it marked (`holiday: true`), so the day counts as worked on a holiday.
export type Change = { ok: true; day: Day | null; message: string } | { ok: false; message: string }

const fail = (message: string): Change => ({ ok: false, message })

// "HH:MM" or the current time; never later than now.
function pickTime(value: string | undefined, now: string): string | Change {
  if (value == null) return now
  const time = normalizeTime(value)
  if (!time) return fail(`${value} is not a time. Use HH:MM, for example 09:15.`)
  if (time > now) return fail(`${time} has not happened yet. Pick a time up to ${now}.`)
  return time
}

// Clocks in, or corrects the clock-in time of an office day. A holiday becomes an office day still marked as one.
export function clockIn(day: Day | undefined, value: string | undefined, now: string): Change {
  if (day && day.kind !== 'office' && day.kind !== 'holiday') {
    return fail(`Today is already logged as ${describeDay(day)}. Run \`logbook reset\` to start over.`)
  }
  const time = pickTime(value, now)
  if (typeof time !== 'string') return time
  if (day?.out && time > day.out) return fail(`Clock-in must be before clock-out (${day.out}).`)
  const holiday = day?.kind === 'holiday' ? { holiday: true as const } : {}
  const message = day?.in ? `Clock-in time changed to ${time}.` : `Clocked in at ${time}${day?.kind === 'holiday' ? ' on a holiday' : ''}.`
  return { ok: true, day: { ...day, kind: 'office', in: time, ...holiday }, message }
}

// Clocks out, or corrects the clock-out time.
export function clockOut(day: Day | undefined, value: string | undefined, now: string): Change {
  if (day?.kind !== 'office' || !day.in) return fail('Not clocked in today. Run `logbook in` first.')
  const time = pickTime(value, now)
  if (typeof time !== 'string') return time
  if (time < day.in) return fail(`Clock-out must be after clock-in (${day.in}).`)
  const message = day.out ? `Clock-out time changed to ${time}.` : `Clocked out at ${time}.`
  return { ok: true, day: { ...day, out: time }, message }
}

export function workFromHome(day: Day | undefined): Change {
  if (day && day.kind !== 'holiday') return fail(`Today is already logged as ${describeDay(day)}. Run \`logbook reset\` to start over.`)
  if (!day) return { ok: true, day: { kind: 'wfh' }, message: 'Working from home today.' }
  return { ok: true, day: { kind: 'wfh', holiday: true, ...(day.note ? { note: day.note } : {}) }, message: 'Working from home on a holiday.' }
}

// Marks a day as a holiday, named by `name` when given. A worked day stays worked and is remembered as a holiday;
// leave becomes a holiday only with `replace`.
export function markHoliday(day: Day | undefined, name: string, replace: boolean): Change {
  const trimmed = name.trim().slice(0, 280)
  const note = trimmed ? { note: trimmed } : {}
  if (day?.kind === 'office' || day?.kind === 'wfh') {
    const next: Day = { ...day, holiday: true, ...note }
    return { ok: true, day: next, message: `Saved as ${describeDay(next)}.` }
  }
  if (day?.kind === 'leave' && !replace) return fail(`That day is ${describeDay(day)}. Add --replace to make it a holiday.`)
  return { ok: true, day: { kind: 'holiday', ...note }, message: `Holiday${trimmed ? `, ${trimmed},` : ''} saved.` }
}

// Undoes `markHoliday`: a holiday off is removed, and a worked holiday is a plain worked day again.
export function unmarkHoliday(day: Day | undefined): Change {
  if (day?.kind === 'holiday') return { ok: true, day: null, message: 'Holiday removed.' }
  if (!day?.holiday) return fail('That day is not marked as a holiday. Weekends always count as holidays.')
  const next: Day = { ...day }
  delete next.holiday
  return { ok: true, day: next, message: `${describeDay(next)}, no longer a holiday.` }
}

// Links typed on one line, split on spaces or commas.
export function parseLinks(text: string): string[] {
  return text.split(/[\s,]+/).filter(Boolean)
}

// What was worked on during a worked holiday (a weekend counts), with links such as GitHub pull requests as proof.
// `undefined` keeps what is there; an empty text or list clears it.
export function recordWork(date: string, day: Day | undefined, work: string | undefined, links: string[] | undefined): Change {
  if (!day || !workedHoliday(date, day)) {
    return fail('Only a worked holiday takes a work log. Clock in or work from home on a holiday or weekend first.')
  }
  const bad = links?.find((link) => !cleanLink(link))
  if (bad) return fail(`${bad} is not a link. Use a full URL, such as https://github.com/owner/repo/pull/1.`)
  const next: Day = { ...day }
  if (work !== undefined) {
    const trimmed = work.trim().slice(0, 1000)
    if (trimmed) next.work = trimmed
    else delete next.work
  }
  if (links !== undefined) {
    const kept = [...new Set(links.flatMap((link) => cleanLink(link) ?? []))].slice(0, 20)
    if (kept.length) next.links = kept
    else delete next.links
  }
  if (!next.work && !next.links) return { ok: true, day: next, message: 'Work log cleared.' }
  return { ok: true, day: next, message: `Work log saved${next.links ? ` with ${plural(next.links.length, 'link')}` : ''}.` }
}

// Replacing an office or home day with leave needs `replace`, the CLI's version of the phone's confirmation.
export function takeLeave(day: Day | undefined, leaveType: LeaveType, note: string, replace: boolean): Change {
  if (day && day.kind !== 'leave' && !replace) {
    return fail(`That day is logged as ${describeDay(day)}. Add --replace to turn it into leave.`)
  }
  const trimmed = note.trim().slice(0, 280)
  const next: Day = { kind: 'leave', leaveType, ...(trimmed ? { note: trimmed } : {}) }
  return { ok: true, day: next, message: `${describeDay(next)} saved.` }
}

// Several days written together, for leave over a range of dates.
export type RangeChange = { ok: true; days: Record<string, Day>; message: string } | { ok: false; message: string }

// Days in `dates` logged as something other than leave; taking leave over them needs `replace`.
export function overwrites(days: Days, dates: string[]): string[] {
  return dates.filter((date) => days[date] && days[date].kind !== 'leave')
}

// The same leave on every date, as the phone's Plan leave sheet does. `dates` comes from `leaveDates`.
export function takeLeaveRange(days: Days, dates: string[], leaveType: LeaveType, note: string, replace: boolean): RangeChange {
  if (dates.length === 0) return { ok: false, message: 'No working days in that range. Add --weekends to include Saturday and Sunday.' }
  const taken = overwrites(days, dates)
  if (taken.length > 0 && !replace) {
    return {
      ok: false,
      message: `${taken.map(formatShort).join(', ')} ${taken.length === 1 ? 'is' : 'are'} already logged. Add --replace to turn ${taken.length === 1 ? 'it' : 'them'} into leave.`,
    }
  }
  const trimmed = note.trim().slice(0, 280)
  const next: Day = { kind: 'leave', leaveType, ...(trimmed ? { note: trimmed } : {}) }
  return {
    ok: true,
    days: Object.fromEntries(dates.map((date) => [date, next])),
    message: `${leaveLabel(leaveType)} saved for ${plural(dates.length, 'day')}, ${formatRange(dates[0], dates[dates.length - 1])}.`,
  }
}

// Today starts over from anything, back to a holiday when it was one; other days only lose leave or a holiday.
export function reset(day: Day | undefined, isToday: boolean): Change {
  if (!day) return fail('Nothing is logged on that day.')
  if (isToday && day.holiday) return { ok: true, day: { kind: 'holiday', ...(day.note ? { note: day.note } : {}) }, message: 'Today is a holiday again.' }
  if (isToday) return { ok: true, day: null, message: 'Today is cleared.' }
  if (day.kind === 'leave') return { ok: true, day: null, message: 'Leave removed.' }
  if (day.kind === 'holiday') return { ok: true, day: null, message: 'Holiday removed.' }
  return fail(`Only leave and holidays can be removed from other days; that day is ${describeDay(day)}.`)
}
