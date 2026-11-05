import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { AppState, StyleSheet, Text, View } from 'react-native'
import { Button, Icon, text } from '@/components/ui'
import { formatMinutes, leaveLabel, minutesBetween, minutesSince, parseDateKey, timeNow, todayKey } from '@/logic'
import { useDays } from '@/store'
import { color, kindMeta } from '@/theme'

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
  const edit = () => router.push({ pathname: '/day', params: { date: today } })
  const elapsed = open && day?.in ? minutesSince(day.in, now) : null
  const done = day?.kind === 'office' ? minutesBetween(day.in, day.out) : null
  const shown = elapsed ?? done

  return (
    <View style={styles.wrap}>
      <Text style={text.muted}>
        {parseDateKey(today).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
      </Text>

      {day?.kind === 'wfh' || day?.kind === 'leave' ? (
        <View style={styles.status}>
          <Icon name={kindMeta[day.kind].icon} size={32} tint={kindMeta[day.kind].tint} />
          <Text style={styles.statusTitle}>{day.kind === 'wfh' ? 'Working from home' : leaveLabel(day.leaveType)}</Text>
        </View>
      ) : (
        <View>
          <Text selectable style={[styles.hours, shown == null && styles.idle]}>
            {shown == null ? '0h 00m' : formatMinutes(shown)}
          </Text>
          <Text style={text.muted}>
            {open && day?.in ? `Since ${day.in}` : done != null && day?.in && day.out ? `${day.in} – ${day.out}` : 'Not clocked in'}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {!day ? (
          <>
            <Button label="Clock in" icon="login" variant="primary" onPress={clockIn} />
            <View style={styles.row}>
              <Button label="From home" grow onPress={() => setDay(today, { kind: 'wfh' })} />
              <Button label="Leave" grow onPress={() => router.push({ pathname: '/apply-leave', params: { from: today } })} />
            </View>
          </>
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
        {day ? <Button label="Edit today" variant="ghost" onPress={edit} /> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 20, paddingTop: 8 },
  hours: { color: color.text, fontSize: 64, fontWeight: '700', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  idle: { color: color.faint },
  status: { gap: 10 },
  statusTitle: { color: color.text, fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  actions: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
})
