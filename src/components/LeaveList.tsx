import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useDialog } from '@/components/Dialog'
import { IconButton, text } from '@/components/ui'
import { eachDate, formatRange, leaveLabel, leaveSpans, plural, type LeaveSpan } from '@/logic'
import { useDays } from '@/store'
import { color } from '@/theme'

export function LeaveList({ year }: { year: number }) {
  const router = useRouter()
  const { days, setDay } = useDays()
  const [dialog, show] = useDialog()
  const prefix = String(year)
  const spans = leaveSpans(days)
    .filter((span) => span.from.startsWith(prefix) || span.to.startsWith(prefix))
    .reverse()

  function remove(span: LeaveSpan) {
    show({
      title: `Remove ${plural(span.count, 'day')} of leave?`,
      message: formatRange(span.from, span.to),
      icon: 'delete-outline',
      action: {
        label: 'Remove',
        destructive: true,
        onPress: () => {
          for (const date of eachDate(span.from, span.to)) {
            if (days[date]?.kind === 'leave') setDay(date, null)
          }
        },
      },
    })
  }

  if (spans.length === 0) return <Text style={text.muted}>No leave in {year}.</Text>

  return (
    <View>
      {spans.map((span, index) => (
        <Pressable
          key={span.from}
          accessibilityRole="button"
          accessibilityLabel={`${formatRange(span.from, span.to)}, ${leaveLabel(span.leaveType)}, ${plural(span.count, 'day')}. Open first day.`}
          onPress={() => router.push({ pathname: '/day', params: { date: span.from } })}
          style={[styles.row, index > 0 && styles.rule]}
        >
          <View style={styles.body}>
            <Text selectable style={styles.title}>
              {formatRange(span.from, span.to)}
            </Text>
            <Text selectable style={text.muted}>
              {leaveLabel(span.leaveType)} · {plural(span.count, 'day')}
              {span.note ? ` · ${span.note}` : ''}
            </Text>
          </View>
          <IconButton
            icon="delete-outline"
            label={`Remove leave ${formatRange(span.from, span.to)}`}
            tint={color.faint}
            onPress={() => remove(span)}
          />
        </Pressable>
      ))}
      {dialog}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  rule: { borderTopWidth: 1, borderTopColor: color.line },
  body: { flex: 1, gap: 2 },
  title: { color: color.text, fontSize: 15, fontWeight: '600' },
})
