import { useEffect, useState } from 'react'
import { AppState, StyleSheet, Text, View } from 'react-native'
import { useDialog } from '@/components/Dialog'
import { LeaveForm } from '@/components/LeaveForm'
import { TimeField } from '@/components/TimeField'
import { Button, Card, Icon, text } from '@/components/ui'
import { formatMinutes, leaveLabel, minutesBetween, minutesSince, timeNow, todayKey } from '@/logic'
import { useDays } from '@/store'
import { color, kindMeta, type IconName } from '@/theme'

// Clock in, clock out and work from home exist only here, for today. Other days can only take leave.
export function TodayCard() {
  const today = todayKey()
  const { days, setDay } = useDays()
  const day = days[today]
  const open = day?.kind === 'office' && Boolean(day.in) && !day.out
  const [now, setNow] = useState(() => new Date())
  const [dialog, show] = useDialog()
  // Leave is a draft until Save, so nothing is recorded while you pick a type or write a note.
  const [choosingLeave, setChoosingLeave] = useState(false)

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date())
    })
    if (!open) return () => sub.remove()
    const id = setInterval(() => setNow(new Date()), 15000)
    return () => {
      sub.remove()
      clearInterval(id)
    }
  }, [open])

  const office = day?.kind === 'office' ? day : null
  const elapsed = open && office?.in ? minutesSince(office.in, now) : null
  const shown = elapsed ?? (office ? minutesBetween(office.in, office.out) : null)

  // Times are 24h "HH:MM", so string order is time order.
  function setTime(which: 'in' | 'out', value: string) {
    if (!office) return
    const inn = which === 'in' ? value : office.in
    const out = which === 'out' ? value : office.out
    if (value > timeNow()) return show({ title: 'That time has not happened yet', message: 'Pick a time up to now.', icon: 'clock-alert-outline' })
    if (inn && out && inn > out) {
      return show({ title: 'Clock-out must be after clock-in', message: `In ${inn}, out ${out}.`, icon: 'clock-alert-outline' })
    }
    setDay(today, { ...office, ...(inn ? { in: inn } : {}), ...(out ? { out } : {}) })
  }

  // Start over takes today back to the three choices.
  const reset = () => setDay(today, null)

  const status: { icon: IconName; tint: string; title: string; sub: string } = !day
    ? choosingLeave
      ? { icon: kindMeta.leave.icon, tint: kindMeta.leave.tint, title: 'Taking leave today', sub: 'Pick the type, add a note, then save' }
      : { icon: 'calendar-alert', tint: color.muted, title: 'Not logged yet', sub: 'Choose how you are working today' }
    : day.kind === 'wfh'
      ? { icon: kindMeta.wfh.icon, tint: kindMeta.wfh.tint, title: 'Working from home', sub: 'Counts as a worked day' }
      : day.kind === 'leave'
        ? { icon: kindMeta.leave.icon, tint: kindMeta.leave.tint, title: leaveLabel(day.leaveType), sub: 'On leave today' }
        : {
            icon: kindMeta.office.icon,
            tint: kindMeta.office.tint,
            title: open ? 'Clocked in' : day.out ? 'Clocked out' : 'In office',
            sub: open ? 'Timer is running' : day.out ? 'Day complete' : 'Not clocked in yet',
          }

  return (
    <Card>
      <View style={styles.status}>
        <View style={[styles.badge, { backgroundColor: `${status.tint}22` }]}>
          <Icon name={status.icon} size={22} tint={status.tint} />
        </View>
        <View style={styles.statusText}>
          <Text style={styles.title}>{status.title}</Text>
          <Text numberOfLines={2} style={text.muted}>
            {status.sub}
          </Text>
        </View>
        {day ? <Button label="Start over" compact onPress={reset} accessibilityLabel="Start today over" /> : null}
      </View>

      {shown != null ? (
        <Text selectable style={styles.hours}>
          {formatMinutes(shown)}
        </Text>
      ) : null}

      {office?.in ? (
        <View style={styles.times}>
          <TimeField label="Clocked in at" value={office.in} onChange={(value) => setTime('in', value)} />
          {office.out ? <TimeField label="Clocked out at" value={office.out} onChange={(value) => setTime('out', value)} /> : null}
        </View>
      ) : null}

      {day?.kind === 'leave' && day.note ? (
        <Text selectable style={styles.note}>
          {day.note}
        </Text>
      ) : null}

      {!day && choosingLeave ? (
        <LeaveForm
          onCancel={() => setChoosingLeave(false)}
          onSave={(leaveType, note) => {
            setDay(today, { kind: 'leave', leaveType, ...(note ? { note } : {}) })
            setChoosingLeave(false)
          }}
        />
      ) : !day ? (
        <View style={styles.actions}>
          <Button label="Clock in" icon="login" variant="primary" onPress={() => setDay(today, { kind: 'office', in: timeNow() })} />
          <View style={styles.row}>
            <Button label="From home" icon={kindMeta.wfh.icon} tint={kindMeta.wfh.tint} grow onPress={() => setDay(today, { kind: 'wfh' })} />
            <Button label="Leave" icon={kindMeta.leave.icon} tint={kindMeta.leave.tint} grow onPress={() => setChoosingLeave(true)} />
          </View>
        </View>
      ) : open && office?.in ? (
        <Button label="Clock out" icon="logout" variant="primary" onPress={() => setDay(today, { ...office, out: timeNow() })} />
      ) : office && !office.in ? (
        <Button label="Clock in" icon="login" variant="primary" onPress={() => setDay(today, { ...office, in: timeNow() })} />
      ) : null}
      {dialog}
    </Card>
  )
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statusText: { flex: 1, gap: 2 },
  times: { gap: 8 },
  note: {
    color: color.text,
    fontSize: 15,
    lineHeight: 21,
    padding: 12,
    borderRadius: 12,
    backgroundColor: color.raised,
  },
  title: { color: color.text, fontSize: 18, fontWeight: '700' },
  hours: { color: color.text, fontSize: 48, fontWeight: '700', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  actions: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
})
