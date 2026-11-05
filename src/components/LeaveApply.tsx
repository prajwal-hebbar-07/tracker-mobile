import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { MonthHeat } from '@/components/MonthHeat'
import { eachDate, formatLong, formatMonth, leaveLabel, leaveTypes, todayKey, type Day, type LeaveType } from '@/logic'
import { useDays } from '@/store'
import { color } from '@/theme'

export function LeaveApply() {
  const router = useRouter()
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
            router.back()
          },
        },
      ],
    )
  }

  return (
    <View style={styles.wrap}>
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
})
