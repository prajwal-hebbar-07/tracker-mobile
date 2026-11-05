import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { MonthHeat } from '@/components/MonthHeat'
import { Screen } from '@/components/Screen'
import { eachDate, formatLong, formatMonth, leaveSpans, todayKey, type Day } from '@/logic'
import { useDays } from '@/store'
import { color } from '@/theme'

export default function LeavesScreen() {
  const today = todayKey()
  const start = new Date()
  const [cursor, setCursor] = useState({ year: start.getFullYear(), month: start.getMonth() })
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [pickingEnd, setPickingEnd] = useState(false)
  const [note, setNote] = useState('')
  const { days, setDay } = useDays()
  const dates = eachDate(from, to)
  const spans = leaveSpans(days).reverse()

  function shift(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
  }

  function pick(date: string) {
    if (!pickingEnd) {
      setFrom(date)
      setTo(date)
      setPickingEnd(true)
      return
    }
    setTo(date)
    setPickingEnd(false)
  }

  function apply() {
    const count = dates.length
    const replaces = dates.some((date) => days[date] && days[date].kind !== 'leave')
    const label =
      count === 1 ? formatLong(dates[0]) : `${formatLong(dates[0])} through ${formatLong(dates[dates.length - 1])}`
    Alert.alert(
      `On leave for ${count} ${count === 1 ? 'day' : 'days'}?`,
      replaces ? `${label}. Days that already have a record will become leave.` : label,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply leave',
          onPress: () => {
            const trimmed = note.trim().slice(0, 280)
            for (const date of dates) {
              const next: Day = { kind: 'leave' }
              if (trimmed) next.note = trimmed
              setDay(date, next)
            }
            setNote('')
            setPickingEnd(false)
          },
        },
      ],
    )
  }

  function remove(span: { from: string; to: string }) {
    const count = eachDate(span.from, span.to).length
    Alert.alert(`Remove ${count} ${count === 1 ? 'day' : 'days'} of leave?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          for (const date of eachDate(span.from, span.to)) {
            if (days[date]?.kind === 'leave') setDay(date, null)
          }
        },
      },
    ])
  }

  return (
    <Screen>
      <Text style={styles.lead}>Select the first day, then the last day.</Text>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shift(-1)} style={styles.arrow}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{formatMonth(cursor.year, cursor.month)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => shift(1)} style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <MonthHeat year={cursor.year} month={cursor.month} days={days} span={{ from, to }} onPick={pick} />
      <Text style={styles.count}>
        {dates.length} {dates.length === 1 ? 'day' : 'days'}
        {dates.length > 1 ? ` · ${formatLong(dates[0])} – ${formatLong(dates[dates.length - 1])}` : ` · ${formatLong(dates[0])}`}
      </Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Note for this leave"
        placeholderTextColor={color.faint}
        maxLength={280}
        style={styles.note}
      />
      <Pressable accessibilityRole="button" onPress={apply} style={styles.apply}>
        <Text style={styles.applyText}>Apply leave</Text>
      </Pressable>

      <Text style={styles.section}>Leave taken</Text>
      {spans.length === 0 ? <Text style={styles.meta}>No leave yet.</Text> : null}
      {spans.map((span) => {
        const count = eachDate(span.from, span.to).length
        const label = span.from === span.to ? formatLong(span.from) : `${formatLong(span.from)} – ${formatLong(span.to)}`
        return (
          <View key={span.from} style={styles.span}>
            <View style={styles.spanText}>
              <Text style={styles.spanTitle}>{label}</Text>
              <Text style={styles.meta}>
                {count} {count === 1 ? 'day' : 'days'}
                {days[span.from]?.note ? ` · ${days[span.from].note}` : ''}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove leave ${label}`} onPress={() => remove(span)} style={styles.remove}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        )
      })}
    </Screen>
  )
}

const styles = StyleSheet.create({
  lead: { color: color.muted, fontSize: 15, lineHeight: 21 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { color: color.text, fontSize: 18, fontWeight: '600' },
  arrow: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: color.office, fontSize: 28, lineHeight: 32 },
  count: { color: color.text, fontSize: 18, fontWeight: '600' },
  note: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: color.text,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    fontSize: 16,
  },
  apply: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.office,
  },
  applyText: { color: color.ink, fontSize: 16, fontWeight: '700' },
  section: { color: color.text, fontSize: 18, fontWeight: '600', marginTop: 8 },
  meta: { color: color.muted, fontSize: 14, lineHeight: 20 },
  span: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  spanText: { flex: 1, gap: 2 },
  spanTitle: { color: color.text, fontSize: 16 },
  remove: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  removeText: { color: color.danger, fontSize: 15, fontWeight: '600' },
})
