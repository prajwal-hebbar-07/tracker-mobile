import { useEffect, useState } from 'react'
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native'
import { formatLong, formatMinutes, minutesBetween, minutesSince, timeNow, todayKey } from '@/logic'
import { useDays } from '@/store'
import { color } from '@/theme'

export function TodayClock() {
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

  const elapsed = open && day?.in ? minutesSince(day.in, now) : null
  const done = day?.kind === 'office' ? minutesBetween(day.in, day.out) : null
  const shown = elapsed ?? done

  function fromHome() {
    setDay(today, { kind: 'wfh', ...(day?.note ? { note: day.note } : {}) })
  }

  function clockIn() {
    setDay(today, { kind: 'office', in: timeNow(), ...(day?.note ? { note: day.note } : {}) })
  }

  function clockOut() {
    if (!day?.in) return
    setDay(today, {
      kind: 'office',
      in: day.in,
      out: timeNow(),
      ...(day.note ? { note: day.note } : {}),
    })
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>Today</Text>
      <Text style={styles.date}>{formatLong(today)}</Text>
      <Text style={styles.hours}>{shown == null ? '—' : formatMinutes(shown)}</Text>
      <Text style={styles.copy}>
        {open && day?.in
          ? `Since clock-in at ${day.in}`
          : done != null && day?.in && day.out
            ? `${day.in} – ${day.out}`
            : day?.kind === 'wfh'
              ? 'From home. No hours today.'
              : day?.kind === 'leave'
                ? 'On leave today.'
                : 'Clock in when you arrive, or mark the day from home.'}
      </Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: day?.kind === 'wfh' }}
          onPress={fromHome}
          style={[styles.button, day?.kind === 'wfh' && styles.buttonOn]}
        >
          <Text style={[styles.buttonText, day?.kind === 'wfh' && styles.buttonTextOn]}>From home</Text>
        </Pressable>
        {open ? (
          <Pressable accessibilityRole="button" onPress={clockOut} style={[styles.button, styles.buttonOn]}>
            <Text style={[styles.buttonText, styles.buttonTextOn]}>Clock out</Text>
          </Pressable>
        ) : done == null ? (
          <Pressable accessibilityRole="button" onPress={clockIn} style={styles.button}>
            <Text style={styles.buttonText}>Clock in</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  kicker: { color: color.muted, fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  date: { color: color.text, fontSize: 22, fontWeight: '600' },
  hours: { color: color.text, fontSize: 48, fontWeight: '600', letterSpacing: -1 },
  copy: { color: color.muted, fontSize: 15, lineHeight: 21 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  button: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    paddingHorizontal: 12,
  },
  buttonOn: { backgroundColor: color.office, borderColor: color.office },
  buttonText: { color: color.text, fontSize: 16, fontWeight: '700' },
  buttonTextOn: { color: color.ink },
})
