import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { MonthHeat } from '@/components/MonthHeat'
import { eachDate, formatLong, formatMonth, leaveLabel, leaveSpans, leaveTypes, todayKey, type Day, type LeaveType } from '@/logic'
import { useDays } from '@/store'
import { color } from '@/theme'

export function LeaveApply() {
  const today = todayKey()
  const start = new Date()
  const [cursor, setCursor] = useState({ year: start.getFullYear(), month: start.getMonth() })
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [pickingEnd, setPickingEnd] = useState(false)
  const [note, setNote] = useState('')
  const [leaveType, setLeaveType] = useState<LeaveType>('personal')
  const [typeOpen, setTypeOpen] = useState(false)
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
              const next: Day = { kind: 'leave', leaveType }
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
    <View style={styles.wrap}>
      <Text style={styles.section}>Leave</Text>
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
      <Text style={styles.fieldLabel}>Leave type</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: typeOpen }}
        onPress={() => setTypeOpen((open) => !open)}
        style={styles.dropdown}
      >
        <Text style={styles.dropdownText}>{leaveLabel(leaveType)}</Text>
        <Text style={styles.dropdownMark}>{typeOpen ? '▴' : '▾'}</Text>
      </Pressable>
      {typeOpen
        ? leaveTypes.map((item) => {
            const selected = item.id === leaveType
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setLeaveType(item.id)
                  setTypeOpen(false)
                }}
                style={[styles.option, selected && styles.optionOn]}
              >
                <Text style={[styles.optionText, selected && styles.optionTextOn]}>{item.label}</Text>
              </Pressable>
            )
          })
        : null}
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Why you're taking this leave"
        placeholderTextColor={color.faint}
        maxLength={280}
        multiline
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
                {leaveLabel(span.leaveType)} · {count} {count === 1 ? 'day' : 'days'}
                {span.note ? ` · ${span.note}` : ''}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove leave ${label}`} onPress={() => remove(span)} style={styles.remove}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  lead: { color: color.muted, fontSize: 15, lineHeight: 21 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { color: color.text, fontSize: 18, fontWeight: '600' },
  arrow: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: color.office, fontSize: 28, lineHeight: 32 },
  count: { color: color.text, fontSize: 18, fontWeight: '600' },
  fieldLabel: { color: color.muted, fontSize: 13, fontWeight: '700' },
  dropdown: {
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: { color: color.text, fontSize: 16, fontWeight: '600' },
  dropdownMark: { color: color.office, fontSize: 14 },
  option: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
  },
  optionOn: { backgroundColor: color.office, borderColor: color.office },
  optionText: { color: color.text, fontSize: 16 },
  optionTextOn: { color: color.ink, fontWeight: '700' },
  note: {
    minHeight: 88,
    borderRadius: 12,
    padding: 14,
    color: color.text,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  apply: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.office,
  },
  applyText: { color: color.ink, fontSize: 16, fontWeight: '700' },
  section: { color: color.text, fontSize: 18, fontWeight: '600' },
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
