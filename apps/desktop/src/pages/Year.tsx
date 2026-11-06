import { formatMinutes, leaveCounts, leaveTypes, summarize, todayKey } from '@logbook/core'
import { useState } from 'react'
import type { Log } from '../log'
import { PeriodNav } from '../ui'

const monthNames = Array.from({ length: 12 }, (_, index) => new Date(2000, index, 1).toLocaleDateString(undefined, { month: 'short' }))

// The phone's Report tab, compacted: totals, leave by type, and each month that has something logged.
export function Year({ log, now }: { log: Log; now: Date }) {
  const today = todayKey(now)
  const thisYear = now.getFullYear()
  const [year, setYear] = useState(thisYear)
  const summary = summarize(log.days, { today, prefix: String(year) })
  const counts = leaveCounts(log.days, String(year))
  const months = monthNames
    .map((name, index) => {
      const key = `${year}-${String(index + 1).padStart(2, '0')}`
      return { name, key, ...summarize(log.days, { today, prefix: key }) }
    })
    .filter((month) => month.office + month.wfh + month.leave > 0)
  const leaveLine = [
    ...leaveTypes.filter((item) => counts[item.id] > 0).map((item) => `${item.label} ${counts[item.id]}`),
    ...(counts.unmarked > 0 ? [`Untyped ${counts.unmarked}`] : []),
  ].join(' · ')

  return (
    <div className="stack">
      <PeriodNav
        label={String(year)}
        onPrev={() => setYear(year - 1)}
        onNext={() => setYear(year + 1)}
        onReset={year === thisYear ? undefined : () => setYear(thisYear)}
      />
      <div className="totals">
        <Total label="Office" value={summary.office} tint="var(--office)" />
        <Total label="Home" value={summary.wfh} tint="var(--wfh)" />
        <Total label="Leave" value={summary.leave} tint="var(--leave)" />
        <Total label="Hours" value={Math.round(summary.minutes / 60)} />
      </div>
      <div className="faint center">
        Weekdays logged {summary.weekdaysMarked} of {summary.weekdays}
      </div>
      {leaveLine ? <div className="muted center">{leaveLine}</div> : null}
      {months.length === 0 ? (
        <div className="muted center">Nothing logged in {year}.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Office</th>
              <th>Home</th>
              <th>Leave</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => (
              <tr key={month.key}>
                <td>{month.name}</td>
                <td>{month.office}</td>
                <td>{month.wfh}</td>
                <td>{month.leave}</td>
                <td>{month.minutes ? formatMinutes(month.minutes) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Total({ label, value, tint }: { label: string; value: number; tint?: string }) {
  return (
    <div className="total">
      <span style={tint ? { color: tint } : undefined}>{value}</span>
      <small>{label}</small>
    </div>
  )
}
