import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  cleanDays,
  eachDate,
  excelSheets,
  formatMinutes,
  leaveCounts,
  leaveDates,
  leaveSpans,
  minutesBetween,
  minutesSince,
  monthCells,
  normalizeTime,
  summarize,
  toCsv,
  tone,
  weekOf,
} from './logic.ts'

const today = '2026-11-05'

test('clock times become minutes, and a backwards pair does not', () => {
  assert.equal(minutesBetween('09:00', '18:30'), 570)
  assert.equal(minutesBetween('9:00', '9:00'), 0)
  assert.equal(minutesBetween('18:00', '09:00'), null)
  assert.equal(minutesBetween('09:00', undefined), null)
  assert.equal(normalizeTime('24:00'), null)
  assert.equal(normalizeTime('23:59'), '23:59')
  assert.equal(formatMinutes(90), '1h 30m')
  assert.equal(formatMinutes(null), '—')
})

test('saved days drop junk and keep a readable log', () => {
  assert.equal(cleanDays(null), null)
  assert.equal(cleanDays([]), null)
  assert.deepEqual(
    cleanDays({
      nope: { kind: 'office' },
      '2026-02-31': { kind: 'leave' },
      '2026-11-02': { kind: 'office', in: '9:05', out: '17:00', note: '  standup  ' },
      '2026-11-03': { kind: 'holiday' },
    }),
    {
      '2026-11-02': { kind: 'office', in: '09:05', out: '17:00', note: 'standup' },
    },
  )
})

test('months start on Monday and still fill complete weeks', () => {
  const november = monthCells(2026, 10)
  assert.equal(november[6], '2026-11-01')
  assert.equal(november.length % 7, 0)
  assert.ok(november.includes('2026-11-30'))
  const october = monthCells(2026, 9)
  assert.equal(october[3], '2026-10-01')
  const june = monthCells(2026, 5)
  assert.equal(june[0], '2026-06-01')
  assert.deepEqual(weekOf('2026-11-01'), [
    '2026-10-26',
    '2026-10-27',
    '2026-10-28',
    '2026-10-29',
    '2026-10-30',
    '2026-10-31',
    '2026-11-01',
  ])
})

test('a month summary counts office, home, leave, and only real hours', () => {
  const summary = summarize(
    {
      '2026-10-30': { kind: 'leave' },
      '2026-11-01': { kind: 'office', in: '10:00', out: '14:00' },
      '2026-11-02': { kind: 'office', in: '09:00', out: '18:00' },
      '2026-11-03': { kind: 'wfh' },
      '2026-11-04': { kind: 'leave' },
      '2026-11-05': { kind: 'office' },
    },
    { today, prefix: '2026-11' },
  )
  assert.equal(summary.office, 3)
  assert.equal(summary.wfh, 1)
  assert.equal(summary.leave, 1)
  assert.equal(summary.minutes, 780)
  assert.equal(summary.officeMissing, 1)
  assert.equal(summary.weekdays, 4)
  assert.equal(summary.weekdaysMarked, 4)
  assert.deepEqual(summary.leaves, ['2026-11-04'])
  assert.equal(summary.months[10], 780)
  assert.equal(summary.months[9], 0)
})

test('leave counts follow type inside the chosen year', () => {
  const counts = leaveCounts(
    {
      '2026-01-02': { kind: 'leave', leaveType: 'sick' },
      '2025-12-31': { kind: 'leave', leaveType: 'sick' },
      '2026-03-01': { kind: 'leave' },
      '2026-03-02': { kind: 'wfh' },
    },
    '2026',
  )
  assert.equal(counts.sick, 1)
  assert.equal(counts.unmarked, 1)
  assert.equal(counts.personal, 0)
})

test('a leave span is the days you select, including the ends', () => {
  assert.deepEqual(eachDate('2026-11-02', '2026-11-06'), [
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
    '2026-11-06',
  ])
  assert.deepEqual(eachDate('2026-11-06', '2026-11-05'), ['2026-11-05', '2026-11-06'])
  assert.deepEqual(
    leaveSpans({
      '2026-11-02': { kind: 'leave' },
      '2026-11-03': { kind: 'leave' },
      '2026-11-04': { kind: 'office', in: '09:00', out: '17:00' },
      '2026-11-10': { kind: 'leave', leaveType: 'sick', note: 'fever' },
      '2026-11-11': { kind: 'leave', leaveType: 'personal' },
    }),
    [
      { from: '2026-11-02', to: '2026-11-03', count: 2 },
      { from: '2026-11-10', to: '2026-11-10', count: 1, leaveType: 'sick', note: 'fever' },
      { from: '2026-11-11', to: '2026-11-11', count: 1, leaveType: 'personal' },
    ],
  )
  assert.equal(cleanDays({ '2026-11-12': { kind: 'leave', leaveType: 'nope' } })?.['2026-11-12'].leaveType, undefined)
})

test('leave skips weekends unless asked, and a span carries over an empty weekend', () => {
  assert.deepEqual(leaveDates('2026-11-06', '2026-11-09', false), ['2026-11-06', '2026-11-09'])
  assert.equal(leaveDates('2026-11-06', '2026-11-09', true).length, 4)
  assert.deepEqual(leaveDates('2026-11-07', '2026-11-08', false), [])
  const friday = { kind: 'leave', leaveType: 'personal' } as const
  assert.deepEqual(leaveSpans({ '2026-11-06': friday, '2026-11-09': friday }), [
    { from: '2026-11-06', to: '2026-11-09', count: 2, leaveType: 'personal' },
  ])
  // Working the Saturday breaks the span.
  assert.equal(
    leaveSpans({ '2026-11-06': friday, '2026-11-07': { kind: 'office' }, '2026-11-09': friday }).length,
    2,
  )
})

test('CSV export quotes notes that would break a column', () => {
  const csv = toCsv({
    '2026-11-03': { kind: 'wfh', in: '09:00', note: 'said "hi", left' },
    '2026-11-02': { kind: 'office', in: '09:00', out: '17:30' },
  })
  assert.deepEqual(csv.split('\n'), [
    'date,weekday,type,leave_type,in,out,minutes,note',
    '2026-11-02,Mon,office,,09:00,17:30,510,',
    '2026-11-03,Tue,wfh,,,,,"said ""hi"", left"',
  ])
})

test('Excel export has a row for every day of each chosen year', () => {
  const days = {
    '2024-02-29': { kind: 'office' as const, in: '09:00', out: '17:30' },
    '2026-11-03': { kind: 'leave' as const, leaveType: 'sick' as const, note: 'flu' },
    '2026-11-07': { kind: 'wfh' as const },
  }
  const split = excelSheets(days, { from: 2024, years: 3, weekends: true, split: true }, today)
  assert.deepEqual(
    split.map((sheet) => [sheet.name, sheet.rows.length]),
    [
      ['2024', 366],
      ['2025', 365],
      ['2026', 365],
    ],
  )
  const leap = split[0].rows[59]
  assert.deepEqual(leap.slice(0, 5), [{ value: 45351, format: 'date' }, 'Thu', 'Office', null, { value: 540 / 1440, format: 'time' }])
  assert.deepEqual(leap[6], { value: 510 / 1440, format: 'duration' })

  const row = (key: string) => split[2].rows[eachDate('2026-01-01', key).length - 1].slice(2)
  assert.deepEqual(row('2026-11-03'), ['Leave', 'Sick leave', null, null, null, 'flu'])
  assert.deepEqual(row('2026-11-04'), ['Not logged'])
  assert.deepEqual(row('2026-11-05'), [null])
  assert.deepEqual(row('2026-11-08'), ['Weekend'])

  // Without weekends, a weekend that was worked still gets its row.
  const [weekdays] = excelSheets(days, { from: 2026, years: 1, weekends: false, split: false }, today)
  assert.equal(weekdays.name, '2026')
  assert.equal(weekdays.rows.length, 261 + 1)
  assert.ok(weekdays.rows.some((cells) => cells[1] === 'Sat' && cells[2] === 'Home'))

  const [joined] = excelSheets(days, { from: 2024, years: 3, weekends: true, split: false }, today)
  assert.equal(joined.name, '2024-2026')
  assert.equal(joined.rows.length, 366 + 365 + 365)
})

test('open clock time counts minutes until now', () => {
  const now = new Date(2026, 10, 5, 12, 30, 40)
  assert.equal(minutesSince('09:00', now), 210)
  assert.equal(minutesSince('13:00', now), null)
})

test('heatmap tones follow the kind and how long the office day was', () => {
  assert.equal(tone(null), 'none')
  assert.equal(tone({ kind: 'wfh' }), 'wfh')
  assert.equal(tone({ kind: 'leave' }), 'leave')
  assert.equal(tone({ kind: 'office' }), 'office-open')
  assert.equal(tone({ kind: 'office', in: '09:00' }), 'office-open')
  assert.equal(tone({ kind: 'office', in: '09:00', out: '11:00' }), 'office')
  assert.equal(tone({ kind: 'office', in: '18:00', out: '09:00' }), 'office-open')
})
