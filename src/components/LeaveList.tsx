import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { eachDate, formatLong, leaveLabel, leaveSpans } from '@/logic'
import { useDays } from '@/store'
import { color } from '@/theme'

export function LeaveList() {
  const { days, setDay } = useDays()
  const spans = leaveSpans(days).reverse()

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

  if (spans.length === 0) return <Text style={styles.meta}>No leave yet.</Text>

  return (
    <View>
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
