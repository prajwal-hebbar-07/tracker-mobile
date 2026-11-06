import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { useDialog } from '@/components/Dialog'
import { MonthHeat } from '@/components/MonthHeat'
import { Screen } from '@/components/Screen'
import { Button, Chip, PeriodNav, text } from '@/components/ui'
import {
  formatMonth,
  formatRange,
  formatShort,
  leaveDates,
  leaveTypes,
  parseDateKey,
  plural,
  type Day,
  type LeaveType,
} from '@logbook/core'
import { useDays } from '@/store'
import { color, leaveIcon, radius } from '@/theme'

export function LeaveApply({ start }: { start: string }) {
  const router = useRouter()
  const opening = parseDateKey(start)
  const [cursor, setCursor] = useState({ year: opening.getFullYear(), month: opening.getMonth() })
  const [from, setFrom] = useState(start)
  const [to, setTo] = useState(start)
  const [picking, setPicking] = useState<'from' | 'to'>('from')
  const [note, setNote] = useState('')
  const [leaveType, setLeaveType] = useState<LeaveType>('personal')
  const [weekends, setWeekends] = useState(false)
  const { days, setDay } = useDays()
  const [dialog, show] = useDialog()
  const dates = leaveDates(from, to, weekends)
  const overwrites = dates.filter((date) => days[date] && days[date].kind !== 'leave')

  function shift(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
  }

  // First tap moves the start; the next tap sets the end. Tapping before the start restarts the range.
  function pick(date: string) {
    if (picking === 'from' || date < from) {
      setFrom(date)
      setTo(date)
      setPicking('to')
      return
    }
    setTo(date)
    setPicking('from')
  }

  function commit() {
    const trimmed = note.trim().slice(0, 280)
    for (const date of dates) {
      const next: Day = { kind: 'leave', leaveType }
      if (trimmed) next.note = trimmed
      setDay(date, next)
    }
    router.back()
  }

  function apply() {
    if (overwrites.length === 0) return commit()
    show({
      title: `Replace ${plural(overwrites.length, 'logged day')}?`,
      message: `${overwrites.map(formatShort).join(', ')} already ${overwrites.length === 1 ? 'has' : 'have'} a record. ${overwrites.length === 1 ? 'It' : 'They'} will become leave.`,
      icon: 'calendar-alert',
      action: { label: 'Replace', destructive: true, onPress: commit },
    })
  }

  return (
    <Screen
      inset
      footer={
        <Button
          label={dates.length === 0 ? 'Pick a working day' : `Apply ${plural(dates.length, 'day')} of leave`}
          icon="check"
          variant="primary"
          tint={color.leave}
          disabled={dates.length === 0}
          onPress={apply}
        />
      }
    >
      {dialog}
      <View style={styles.summary}>
        <Text selectable style={styles.count}>
          {formatRange(from, to)}
        </Text>
        <Text style={text.muted}>
          {plural(dates.length, 'day')} · {picking === 'to' ? 'tap the last day, or apply for just this one' : 'tap the first day'}
        </Text>
      </View>

      <PeriodNav noun="month" label={formatMonth(cursor.year, cursor.month)} onPrev={() => shift(-1)} onNext={() => shift(1)} />
      <MonthHeat year={cursor.year} month={cursor.month} days={days} span={{ from, to }} onPick={pick} />

      <View style={styles.toggle}>
        <Text style={[text.body, styles.toggleText]}>Count weekends</Text>
        <Switch
          value={weekends}
          onValueChange={setWeekends}
          trackColor={{ false: color.raised, true: color.leave }}
          thumbColor={color.text}
        />
      </View>

      <View style={styles.section}>
        <Text style={text.label}>Leave type</Text>
        <View style={styles.chips}>
          {leaveTypes.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              icon={leaveIcon[item.id]}
              tint={color.leave}
              selected={item.id === leaveType}
              onPress={() => setLeaveType(item.id)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={text.label}>Note</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Reason, approval, who you told…"
          placeholderTextColor={color.faint}
          maxLength={280}
          multiline
          style={styles.note}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  summary: { gap: 2 },
  count: { color: color.text, fontSize: 22, fontWeight: '700' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleText: { flex: 1 },
  section: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: {
    minHeight: 88,
    borderRadius: radius.md,
    padding: 14,
    color: color.text,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    fontSize: 16,
    textAlignVertical: 'top',
  },
})
