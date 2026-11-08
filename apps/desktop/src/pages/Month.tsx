import { describeDay, formatLong, formatMinutes, formatMonth, monthCells, summarize, todayKey, tone, type Day } from '@logbook/core'
import { mdiDeleteOutline, mdiPencilOutline } from '@mdi/js'
import { useState } from 'react'
import type { Log } from '../log'
import { Button, kindMeta, LeaveForm, PeriodNav, useConfirm } from '../ui'

const dow = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// A month at a glance. Click a day to see it; days other than today only take leave, as on the phone.
export function Month({ log, now, onToday }: { log: Log; now: Date; onToday: () => void }) {
  const today = todayKey(now)
  const current = { year: now.getFullYear(), month: now.getMonth() }
  const [cursor, setCursor] = useState(current)
  const [picked, setPicked] = useState<string | null>(null)
  const prefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`
  const summary = summarize(log.days, { today, prefix })
  const isCurrent = cursor.year === current.year && cursor.month === current.month

  function shift(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
    setPicked(null)
  }

  return (
    <div className="stack">
      <PeriodNav
        label={formatMonth(cursor.year, cursor.month)}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        onReset={isCurrent ? undefined : () => setCursor(current)}
      />
      <div className="grid">
        {dow.map((name, index) => (
          <span key={index} className={`dow${index > 4 ? ' weekend' : ''}`}>
            {name}
          </span>
        ))}
        {monthCells(cursor.year, cursor.month).map((date, index) =>
          date ? (
            <button
              type="button"
              key={date}
              className={`cell tone-${tone(log.days[date] ?? null)}${date === today ? ' today' : ''}${date === picked ? ' picked' : ''}${date > today ? ' future' : ''}`}
              aria-label={formatLong(date)}
              onClick={() => (date === today ? onToday() : setPicked(date === picked ? null : date))}
            >
              {Number(date.slice(8))}
            </button>
          ) : (
            <span key={`blank-${index}`} />
          ),
        )}
      </div>
      {picked ? (
        <DayPanel key={picked} date={picked} day={log.days[picked]} onChange={(day) => log.setDay(picked, day)} />
      ) : (
        <div className="muted center">
          {summary.office} office · {summary.wfh} home · {summary.leave} leave · {formatMinutes(summary.minutes)}
        </div>
      )}
    </div>
  )
}

function DayPanel({ date, day, onChange }: { date: string; day?: Day; onChange: (day: Day | null) => void }) {
  const [editing, setEditing] = useState(false)
  const [dialog, confirm] = useConfirm()
  const meta = day ? kindMeta[day.kind] : null

  if (editing) {
    return (
      <LeaveForm
        initialType={day?.kind === 'leave' ? day.leaveType : undefined}
        initialNote={day?.kind === 'leave' ? day.note : undefined}
        onCancel={() => setEditing(false)}
        onSave={(leaveType, note) => {
          const write = () => {
            onChange({ kind: 'leave', leaveType, ...(note ? { note } : {}) })
            setEditing(false)
          }
          if (!day || day.kind === 'leave') return write()
          confirm({
            title: 'Replace this day with leave?',
            message: `It is logged as ${describeDay(day)}. That record will be replaced.`,
            action: 'Replace',
            onConfirm: write,
          })
        }}
      />
    )
  }

  return (
    <div className="stack">
      <div className="record">
        <strong style={meta ? { color: meta.tint } : undefined}>{formatLong(date)}</strong>
        <div>{day ? describeDay(day) : 'Nothing logged'}</div>
        {(day?.kind === 'leave' || day?.kind === 'holiday') && day.note ? <div className="muted">{day.note}</div> : null}
      </div>
      {day?.kind === 'leave' ? (
        <div className="row">
          <Button label="Edit leave" icon={mdiPencilOutline} grow onClick={() => setEditing(true)} />
          <Button
            label="Remove"
            icon={mdiDeleteOutline}
            variant="danger"
            grow
            onClick={() =>
              confirm({ title: 'Remove this leave?', message: 'The day goes back to nothing logged.', action: 'Remove', onConfirm: () => onChange(null) })
            }
          />
        </div>
      ) : (
        <Button label="Mark as leave" icon={kindMeta.leave.icon} tint="var(--leave)" onClick={() => setEditing(true)} />
      )}
      {dialog}
    </div>
  )
}
