import assert from 'node:assert/strict'
import { test } from 'node:test'
import { leaveDates } from '@logbook/core'
import {
  clockIn,
  clockOut,
  markHoliday,
  parseLinks,
  reset,
  setNotes,
  takeLeave,
  takeLeaveRange,
  unmarkHoliday,
  workFromHome,
  type Change,
} from './actions.ts'

const now = '12:00'

// The day a successful change writes; fails the test with the refusal message otherwise.
function written(change: Change) {
  assert.ok(change.ok, change.message)
  return change.day
}

test('clock times can be fixed but never run backwards or into the future', () => {
  assert.deepEqual(written(clockIn(undefined, '09:05', now)), { kind: 'office', in: '09:05' })
  assert.equal(clockIn(undefined, '12:01', now).ok, false)
  assert.equal(clockIn(undefined, '9.05', now).ok, false)
  assert.equal(clockOut(undefined, undefined, now).ok, false)
  assert.equal(clockOut({ kind: 'office', in: '09:05' }, '08:00', now).ok, false)
  assert.deepEqual(written(clockOut({ kind: 'office', in: '09:05' }, '11:30', now)), { kind: 'office', in: '09:05', out: '11:30' })
  // Moving clock-in after clock-out is refused; moving it earlier is a correction.
  assert.equal(clockIn({ kind: 'office', in: '09:05', out: '11:30' }, '11:45', now).ok, false)
  assert.deepEqual(written(clockIn({ kind: 'office', in: '09:05', out: '11:30' }, '08:50', now)), {
    kind: 'office',
    in: '08:50',
    out: '11:30',
  })
})

test('home and clock-in need an empty or office day', () => {
  assert.equal(workFromHome({ kind: 'office', in: '09:00' }).ok, false)
  assert.equal(clockIn({ kind: 'wfh' }, undefined, now).ok, false)
  assert.deepEqual(written(workFromHome(undefined)), { kind: 'wfh' })
})

test('leave replaces a worked day only when asked, and notes are trimmed', () => {
  assert.equal(takeLeave({ kind: 'office', in: '09:00' }, 'sick', '', false).ok, false)
  assert.deepEqual(written(takeLeave({ kind: 'office', in: '09:00' }, 'sick', '  flu  ', true)), {
    kind: 'leave',
    leaveType: 'sick',
    note: 'flu',
  })
  assert.deepEqual(written(takeLeave({ kind: 'leave', leaveType: 'sick' }, 'personal', '', false)), { kind: 'leave', leaveType: 'personal' })
})

test('leave over a range skips weekends, keeps leave already taken, and replaces worked days only when asked', () => {
  // Fri 6 Nov to Tue 10 Nov 2026; the 9th is an office day, the 10th is already leave.
  const days = { '2026-11-09': { kind: 'office', in: '09:00' }, '2026-11-10': { kind: 'leave', leaveType: 'sick' } } as const
  const dates = leaveDates(days, '2026-11-06', '2026-11-10', false)
  assert.equal(takeLeaveRange(days, dates, 'personal', '', false).ok, false)
  const change = takeLeaveRange(days, dates, 'personal', ' trip ', true)
  assert.ok(change.ok, change.message)
  const leave = { kind: 'leave', leaveType: 'personal', note: 'trip' }
  assert.deepEqual(change.days, { '2026-11-06': leave, '2026-11-09': leave, '2026-11-10': leave })
  assert.ok(takeLeaveRange({ '2026-11-10': { kind: 'leave' } }, ['2026-11-10'], 'sick', '', false).ok)
  assert.equal(takeLeaveRange({}, leaveDates({}, '2026-11-07', '2026-11-08', false), 'sick', '', true).ok, false)
})

test('other days only lose leave or a holiday; today starts over from anything', () => {
  assert.equal(reset({ kind: 'office', in: '09:00' }, false).ok, false)
  assert.equal(reset({ kind: 'leave' }, false).ok, true)
  assert.equal(written(reset({ kind: 'holiday', note: 'Diwali' }, false)), null)
  assert.equal(reset({ kind: 'office', in: '09:00' }, true).ok, true)
  assert.equal(reset(undefined, true).ok, false)
})

test('working on a holiday keeps it marked, and starting over goes back to the holiday', () => {
  const diwali = { kind: 'holiday', note: 'Diwali' } as const
  assert.deepEqual(written(clockIn(diwali, '09:00', now)), { kind: 'office', note: 'Diwali', in: '09:00', holiday: true })
  assert.deepEqual(written(workFromHome(diwali)), { kind: 'wfh', holiday: true, note: 'Diwali' })
  assert.deepEqual(written(reset({ kind: 'wfh', holiday: true, note: 'Diwali' }, true)), diwali)
})

test('marking a holiday keeps a worked day, replaces leave only when asked, and can be undone', () => {
  assert.deepEqual(written(markHoliday(undefined, '  New Year  ', false)), { kind: 'holiday', note: 'New Year' })
  assert.deepEqual(written(markHoliday({ kind: 'office', in: '09:00' }, '', false)), { kind: 'office', in: '09:00', holiday: true })
  assert.equal(markHoliday({ kind: 'leave', leaveType: 'sick' }, '', false).ok, false)
  assert.deepEqual(written(markHoliday({ kind: 'leave', leaveType: 'sick' }, '', true)), { kind: 'holiday' })
  assert.deepEqual(written(unmarkHoliday({ kind: 'office', in: '09:00', holiday: true })), { kind: 'office', in: '09:00' })
  assert.equal(written(unmarkHoliday({ kind: 'holiday' })), null)
  assert.equal(unmarkHoliday({ kind: 'wfh' }).ok, false)
})

test('notes go on any logged day; links only on worked days, and only real ones', () => {
  const pr = 'https://github.com/owner/repo/pull/12'
  const commit = 'https://github.com/owner/repo/commit/abc123'
  assert.equal(setNotes(undefined, 'fix', undefined).ok, false)
  assert.deepEqual(written(setNotes({ kind: 'office', in: '09:00' }, ' fixed the build ', undefined)), {
    kind: 'office',
    in: '09:00',
    work: 'fixed the build',
  })
  assert.equal(setNotes({ kind: 'wfh' }, undefined, ['repo#12']).ok, false)
  assert.deepEqual(parseLinks(` ${pr}, ${commit}  ${pr} `), [pr, commit, pr])
  assert.deepEqual(written(setNotes({ kind: 'wfh' }, '  release fix ', parseLinks(`${pr} ${commit} ${pr}`))), {
    kind: 'wfh',
    work: 'release fix',
    links: [pr, commit],
  })
  // Only what is given changes; empty values clear.
  assert.deepEqual(written(setNotes({ kind: 'office', holiday: true, note: 'Diwali', work: 'a', links: [pr] }, 'b', undefined)), {
    kind: 'office',
    holiday: true,
    note: 'Diwali',
    work: 'b',
    links: [pr],
  })
  assert.deepEqual(written(setNotes({ kind: 'wfh', work: 'a', links: [pr] }, '', [])), { kind: 'wfh' })
  // Leave and a holiday off keep a plain note, and take no links.
  assert.deepEqual(written(setNotes({ kind: 'leave', leaveType: 'sick' }, 'flu', undefined)), { kind: 'leave', leaveType: 'sick', note: 'flu' })
  assert.deepEqual(written(setNotes({ kind: 'holiday', note: 'Diwali' }, '', [])), { kind: 'holiday' })
  assert.equal(setNotes({ kind: 'leave' }, 'flu', [pr]).ok, false)
})
