import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import {
  formatLong,
  formatMinutes,
  minutesBetween,
  normalizeTime,
  timeNow,
  type Day,
  type Kind,
} from '@/logic'
import { color } from '@/theme'

const kinds: { kind: Kind; label: string }[] = [
  { kind: 'office', label: 'Office' },
  { kind: 'wfh', label: 'From home' },
]

export function DayEditor({
  date,
  day,
  onChange,
}: {
  date: string
  day?: Day
  onChange: (day: Day | null) => void
}) {
  const [inn, setInn] = useState(day?.in ?? '')
  const [out, setOut] = useState(day?.out ?? '')
  const [note, setNote] = useState(day?.note ?? '')

  function withNote(kind: Kind, start?: string, end?: string, text = note): Day {
    const next: Day = { kind }
    if (start) next.in = start
    if (end) next.out = end
    const trimmed = text.trim().slice(0, 280)
    if (trimmed) next.note = trimmed
    return next
  }

  function pick(kind: Kind) {
    onChange(withNote(kind, normalizeTime(inn) ?? day?.in, normalizeTime(out) ?? day?.out))
  }

  function writeTime(which: 'in' | 'out', text: string) {
    if (which === 'in') setInn(text)
    else setOut(text)
    if (!day) return
    const trimmed = text.trim()
    if (trimmed !== '' && !normalizeTime(trimmed)) return
    const start = which === 'in' ? normalizeTime(trimmed) : day.in
    const end = which === 'out' ? normalizeTime(trimmed) : day.out
    onChange(withNote(day.kind, start ?? undefined, end ?? undefined))
  }

  function stamp(which: 'in' | 'out') {
    writeTime(which, timeNow())
  }

  const mins = day?.kind === 'office' ? minutesBetween(day.in, day.out) : null
  const backwards = Boolean(day?.kind === 'office' && day.in && day.out && mins == null)
  const badIn = inn.trim() !== '' && !normalizeTime(inn)
  const badOut = out.trim() !== '' && !normalizeTime(out)

  return (
    <View style={styles.wrap}>
      <Text style={styles.date}>{formatLong(date)}</Text>
      <View style={styles.kinds}>
        {kinds.map((item) => {
          const selected = day?.kind === item.kind
          return (
            <Pressable
              key={item.kind}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => pick(item.kind)}
              style={[styles.kind, selected && styles.kindOn]}
            >
              <Text style={[styles.kindText, selected && styles.kindTextOn]}>{item.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {!day ? <Text style={styles.copy}>Nothing recorded for this day yet.</Text> : null}
      {day?.kind === 'wfh' ? (
        <Text style={styles.copy}>From home. This day counts as worked, with no clock times.</Text>
      ) : null}
      {day?.kind === 'leave' ? (
        <Text style={styles.copy}>This day is leave. Add or remove it from Work.</Text>
      ) : null}

      {day?.kind === 'office' ? (
        <View style={styles.office}>
          <Text style={styles.hours}>{mins == null ? '—' : formatMinutes(mins)}</Text>
          <TimeRow label="In" value={inn} invalid={badIn} onChange={(text) => writeTime('in', text)} onNow={() => stamp('in')} />
          <TimeRow label="Out" value={out} invalid={badOut} onChange={(text) => writeTime('out', text)} onNow={() => stamp('out')} />
          {backwards ? <Text style={styles.warn}>Clock-out is before clock-in.</Text> : null}
          {badIn || badOut ? <Text style={styles.warn}>Use 24-hour time, like 09:41.</Text> : null}
          {!day.in || !day.out ? <Text style={styles.copy}>Clock in and out to record the hours.</Text> : null}
        </View>
      ) : null}

      {day ? (
        <TextInput
          value={note}
          onChangeText={(text) => {
            setNote(text)
            onChange(withNote(day.kind, day.in, day.out, text))
          }}
          placeholder="Note"
          placeholderTextColor={color.faint}
          maxLength={280}
          multiline
          style={styles.note}
        />
      ) : null}

      {day ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setInn('')
            setOut('')
            setNote('')
            onChange(null)
          }}
          style={styles.clear}
        >
          <Text style={styles.clearText}>Clear this day</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function TimeRow({
  label,
  value,
  invalid,
  onChange,
  onNow,
}: {
  label: string
  value: string
  invalid: boolean
  onChange: (text: string) => void
  onNow: () => void
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numbers-and-punctuation"
        placeholder="09:41"
        placeholderTextColor={color.faint}
        maxLength={5}
        style={[styles.time, invalid && styles.timeBad]}
        accessibilityLabel={`${label} time`}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={`Set ${label} to now`} onPress={onNow} style={styles.now}>
        <Text style={styles.nowText}>Now</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  date: { color: color.text, fontSize: 28, fontWeight: '600', letterSpacing: -0.4 },
  kinds: { flexDirection: 'row', gap: 8 },
  kind: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
  },
  kindOn: { backgroundColor: color.office, borderColor: color.office },
  kindText: { color: color.text, fontSize: 14, fontWeight: '600' },
  kindTextOn: { color: color.ink },
  copy: { color: color.muted, fontSize: 15, lineHeight: 21 },
  office: { gap: 10 },
  hours: { color: color.text, fontSize: 40, fontWeight: '600', letterSpacing: -1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { width: 36, color: color.muted, fontSize: 13, fontWeight: '600' },
  time: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: color.text,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  timeBad: { borderColor: color.danger },
  now: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
  },
  nowText: { color: color.office, fontSize: 15, fontWeight: '700' },
  warn: { color: color.danger, fontSize: 14 },
  note: {
    minHeight: 72,
    borderRadius: 12,
    padding: 14,
    color: color.text,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  clear: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  clearText: { color: color.danger, fontSize: 15, fontWeight: '600' },
})
