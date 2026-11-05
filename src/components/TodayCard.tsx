import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { AppState, StyleSheet, Text, View } from 'react-native'
import { Button, Card, Icon, text } from '@/components/ui'
import { formatMinutes, leaveLabel, minutesBetween, minutesSince, timeNow, todayKey } from '@/logic'
import { useDays } from '@/store'
import { color, kindMeta, type IconName } from '@/theme'

export function TodayCard() {
  const router = useRouter()
  const today = todayKey()
  const { days, setDay } = useDays()
  const day = days[today]
  const open = day?.kind === 'office' && Boolean(day.in) && !day.out
  const [now, setNow] = useState(() => new Date())

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

  const note = day?.note ? { note: day.note } : {}
  const clockIn = () => setDay(today, { kind: 'office', in: timeNow(), ...note })
  const elapsed = open && day?.in ? minutesSince(day.in, now) : null
  const done = day?.kind === 'office' ? minutesBetween(day.in, day.out) : null
  const shown = elapsed ?? done

  // One status line for every state, so the card reads the same whatever the day is.
  const status: { icon: IconName; tint: string; title: string; sub: string } = !day
    ? { icon: 'calendar-alert', tint: color.muted, title: 'Not logged yet', sub: 'Clock in, or mark the day' }
    : day.kind === 'wfh'
      ? { icon: kindMeta.wfh.icon, tint: kindMeta.wfh.tint, title: 'Working from home', sub: day.note ?? 'Counts as a worked day' }
      : day.kind === 'leave'
        ? { icon: kindMeta.leave.icon, tint: kindMeta.leave.tint, title: leaveLabel(day.leaveType), sub: day.note ?? 'Day off' }
        : {
            icon: kindMeta.office.icon,
            tint: kindMeta.office.tint,
            title: open ? 'Clocked in' : 'In office',
            sub: open && day.in ? `Since ${day.in}` : day.in && day.out ? `${day.in} – ${day.out}` : 'No clock-in yet',
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
        {day ? (
          <Button
            label="Edit"
            compact
            onPress={() => router.push({ pathname: '/day', params: { date: today } })}
            accessibilityLabel="Edit today"
          />
        ) : null}
      </View>

      {shown != null ? (
        <Text selectable style={styles.hours}>
          {formatMinutes(shown)}
        </Text>
      ) : null}

      {!day ? (
        <View style={styles.actions}>
          <Button label="Clock in" icon="login" variant="primary" onPress={clockIn} />
          <View style={styles.row}>
            <Button label="From home" grow onPress={() => setDay(today, { kind: 'wfh' })} />
            <Button label="Leave" grow onPress={() => router.push({ pathname: '/apply-leave', params: { from: today } })} />
          </View>
        </View>
      ) : open ? (
        <Button
          label="Clock out"
          icon="logout"
          variant="primary"
          onPress={() => day?.in && setDay(today, { kind: 'office', in: day.in, out: timeNow(), ...note })}
        />
      ) : day.kind === 'office' && !day.in ? (
        <Button label="Clock in" icon="login" variant="primary" onPress={clockIn} />
      ) : null}
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
