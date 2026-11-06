import { formatMinutes, leaveLabel, minutesBetween, minutesSince, timeNow, todayKey } from '@logbook/core'
import { mdiCalendarAlert, mdiLogin, mdiLogout } from '@mdi/js'
import { useState } from 'react'
import type { Log } from '../log'
import { Button, Icon, kindMeta, LeaveForm } from '../ui'

// Clock in, clock out and work from home happen only here, for today, as on the phone.
export function Today({ log, now }: { log: Log; now: Date }) {
  const today = todayKey(now)
  const day = log.days[today]
  const office = day?.kind === 'office' ? day : null
  const open = Boolean(office?.in) && !office?.out
  const [choosingLeave, setChoosingLeave] = useState(false)
  const [problem, setProblem] = useState('')

  const shown = open && office?.in ? minutesSince(office.in, now) : office ? minutesBetween(office.in, office.out) : null

  // Times are 24h "HH:MM", so string order is time order.
  function setTime(which: 'in' | 'out', value: string) {
    if (!office || !value) return
    const inn = which === 'in' ? value : office.in
    const out = which === 'out' ? value : office.out
    if (value > timeNow(now)) return setProblem('That time has not happened yet.')
    if (inn && out && inn > out) return setProblem(`Clock-out must be after clock-in (in ${inn}, out ${out}).`)
    setProblem('')
    log.setDay(today, { ...office, ...(inn ? { in: inn } : {}), ...(out ? { out } : {}) })
  }

  const status = !day
    ? choosingLeave
      ? { ...kindMeta.leave, title: 'Taking leave today', sub: 'Pick the type, then save' }
      : { icon: mdiCalendarAlert, tint: 'var(--muted)', title: 'Not logged yet', sub: 'How are you working today?' }
    : day.kind === 'wfh'
      ? { ...kindMeta.wfh, title: 'Working from home', sub: 'Counts as a worked day' }
      : day.kind === 'leave'
        ? { ...kindMeta.leave, title: leaveLabel(day.leaveType), sub: 'On leave today' }
        : {
            ...kindMeta.office,
            title: open ? 'Clocked in' : day.out ? 'Clocked out' : 'In office',
            sub: open ? 'Timer is running' : day.out ? 'Day complete' : 'Not clocked in yet',
          }

  return (
    <div className="stack">
      <div className="status">
        <span className="badge" style={{ background: `color-mix(in srgb, ${status.tint} 18%, transparent)` }}>
          <Icon path={status.icon} size={22} tint={status.tint} />
        </span>
        <div className="grow">
          <strong>{status.title}</strong>
          <div className="muted">{status.sub}</div>
        </div>
        {day ? (
          <button type="button" className="link" onClick={() => log.setDay(today, null)}>
            Start over
          </button>
        ) : null}
      </div>

      {shown != null ? <div className="hours">{formatMinutes(shown)}</div> : null}

      {office?.in ? (
        <div className="row">
          <label className="time grow">
            In
            <input type="time" value={office.in} onChange={(event) => setTime('in', event.target.value)} />
          </label>
          {office.out ? (
            <label className="time grow">
              Out
              <input type="time" value={office.out} onChange={(event) => setTime('out', event.target.value)} />
            </label>
          ) : null}
        </div>
      ) : null}
      {problem ? <div className="danger">{problem}</div> : null}

      {day?.kind === 'leave' && day.note ? <div className="note">{day.note}</div> : null}

      {!day && choosingLeave ? (
        <LeaveForm
          onCancel={() => setChoosingLeave(false)}
          onSave={(leaveType, note) => {
            log.setDay(today, { kind: 'leave', leaveType, ...(note ? { note } : {}) })
            setChoosingLeave(false)
          }}
        />
      ) : !day ? (
        <div className="stack">
          <Button label="Clock in" icon={mdiLogin} variant="primary" onClick={() => log.setDay(today, { kind: 'office', in: timeNow(now) })} />
          <div className="row">
            <Button label="From home" icon={kindMeta.wfh.icon} tint={kindMeta.wfh.tint} grow onClick={() => log.setDay(today, { kind: 'wfh' })} />
            <Button label="Leave" icon={kindMeta.leave.icon} tint={kindMeta.leave.tint} grow onClick={() => setChoosingLeave(true)} />
          </div>
        </div>
      ) : open && office ? (
        <Button label="Clock out" icon={mdiLogout} variant="primary" onClick={() => log.setDay(today, { ...office, out: timeNow(now) })} />
      ) : office && !office.in ? (
        <Button label="Clock in" icon={mdiLogin} variant="primary" onClick={() => log.setDay(today, { ...office, in: timeNow(now) })} />
      ) : null}
    </div>
  )
}
