import { describeDay, formatRange, formatShort, leaveLabel, normalizeTime, plural, type Day, type Days, type LeaveType } from '@logbook/core'

// The phone's rules, shared by the commands and the interactive view: clock in, clock out and work from
// home only happen today; any day can take leave; office and home days are only undone from today.
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

// Clocks in, or corrects the clock-in time of an office day.
export function clockIn(day: Day | undefined, value: string | undefined, now: string): Change {
  if (day && day.kind !== 'office') return fail(`Today is already logged as ${describeDay(day)}. Run \`logbook reset\` to start over.`)
  const time = pickTime(value, now)
  if (typeof time !== 'string') return time
  if (day?.out && time > day.out) return fail(`Clock-in must be before clock-out (${day.out}).`)
  const message = day?.in ? `Clock-in time changed to ${time}.` : `Clocked in at ${time}.`
  return { ok: true, day: { ...day, kind: 'office', in: time }, message }
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
  if (day) return fail(`Today is already logged as ${describeDay(day)}. Run \`logbook reset\` to start over.`)
  return { ok: true, day: { kind: 'wfh' }, message: 'Working from home today.' }
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

// Today starts over from anything; other days only lose leave.
export function reset(day: Day | undefined, isToday: boolean): Change {
  if (!day) return fail('Nothing is logged on that day.')
  if (!isToday && day.kind !== 'leave') return fail(`Only leave can be removed from other days; that day is ${describeDay(day)}.`)
  return { ok: true, day: null, message: isToday ? 'Today is cleared.' : 'Leave removed.' }
}
