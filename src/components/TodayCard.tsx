import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { AppState, StyleSheet, Text, View } from 'react-native'
import { useDialog } from '@/components/Dialog'
import { TimeField } from '@/components/TimeField'
import { Button, Card, Icon, text } from '@/components/ui'
import { formatMinutes, leaveLabel, minutesBetween, minutesSince, timeNow, todayKey } from '@/logic'
import { useDays } from '@/store'
import { color, kindMeta, type IconName } from '@/theme'

// Clock in, clock out and work from home exist only here, for today. Other days can only take leave.
export function TodayCard() {
  const router = useRouter()
  const today = todayKey()
  const { days, setDay } = useDays()
  const day = days[today]
  const open = day?.kind === 'office' && Boolean(day.in) && !day.out
  const [now, setNow] = useState(() => new Date())
  const [dialog, show] = useDialog()

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

  // Change takes today back to the start, where you choose again.
  function reset() {
    if (!office?.in) return setDay(today, null)
    show({
      title: 'Start today over?',
      message: 'Your clock times for today will be cleared and you can choose again.',
      icon: 'restart',
      action: { label: 'Start over', destructive: true, onPress: () => setDay(today, null) },
    })
  }

  const status: { icon: IconName; tint: string; title: string; sub: string } = !day
    ? { icon: 'calendar-alert', tint: color.muted, title: 'Not logged yet', sub: 'Choose how you are working today' }
    : day.kind === 'wfh'
      ? { icon: kindMeta.wfh.icon, tint: kindMeta.wfh.tint, title: 'Working from home', sub: 'Counts as a worked day' }
      : day.kind === 'leave'
        ? { icon: kindMeta.leave.icon, tint: kindMeta.leave.tint, title: leaveLabel(day.leaveType), sub: day.note ?? 'On leave today' }
        : {
            icon: kindMeta.office.icon,
            tint: kindMeta.office.tint,
            title: open ? 'Clocked in' : day.out ? 'Clocked out' : 'In office',
            sub: open ? 'Tap the time below if it is wrong' : day.out ? 'Tap a time below to fix it' : 'Not clocked in yet',
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
        {day ? <Button label="Change" compact onPress={reset} accessibilityLabel="Change today, start over" /> : null}
      </View>

      {shown != null ? (
        <Text selectable style={styles.hours}>
          {formatMinutes(shown)}
        </Text>
      ) : null}

      {office?.in ? (
        <View style={styles.row}>
          <TimeField label="Clock in" value={office.in} onChange={(value) => setTime('in', value)} />
          {office.out ? <TimeField label="Clock out" value={office.out} onChange={(value) => setTime('out', value)} /> : null}
        </View>
      ) : null}

      {!day ? (
        <View style={styles.actions}>
          <Button label="Clock in" icon="login" variant="primary" onPress={() => setDay(today, { kind: 'office', in: timeNow() })} />
          <View style={styles.row}>
            <Button label="From home" icon={kindMeta.wfh.icon} tint={kindMeta.wfh.tint} grow onPress={() => setDay(today, { kind: 'wfh' })} />
            <Button
              label="Leave"
              icon={kindMeta.leave.icon}
              tint={kindMeta.leave.tint}
              grow
              onPress={() => router.push({ pathname: '/apply-leave', params: { from: today } })}
            />
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
  title: { color: color.text, fontSize: 18, fontWeight: '700' },
  hours: { color: color.text, fontSize: 48, fontWeight: '700', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  actions: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
})
