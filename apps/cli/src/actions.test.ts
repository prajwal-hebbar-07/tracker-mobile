import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clockIn, clockOut, reset, takeLeave, workFromHome, type Change } from './actions.ts'

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

test('other days only lose leave; today starts over from anything', () => {
  assert.equal(reset({ kind: 'office', in: '09:00' }, false).ok, false)
  assert.equal(reset({ kind: 'leave' }, false).ok, true)
  assert.equal(reset({ kind: 'office', in: '09:00' }, true).ok, true)
  assert.equal(reset(undefined, true).ok, false)
})
