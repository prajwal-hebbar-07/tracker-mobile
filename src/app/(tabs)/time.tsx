import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { summarize, todayKey } from '@/logic'
import { useDays } from '@/store'
import { color } from '@/theme'

export default function TimeScreen() {
  const today = todayKey()
  const { days } = useDays()
  const all = summarize(days, { today })
  const year = summarize(days, { today, prefix: today.slice(0, 4) })

  return (
    <Screen>
      <Text style={styles.kicker}>From home</Text>
      <Text style={styles.count}>{all.wfh}</Text>
      <Text style={styles.lead}>
        {all.wfh === 1 ? 'day' : 'days'} worked from home · {year.wfh} this year
      </Text>
      <Link href="/leaves" asChild>
        <Pressable accessibilityRole="button" style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Leaves</Text>
            <Text style={styles.meta}>
              {all.leave} {all.leave === 1 ? 'day' : 'days'} taken
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </Link>
    </Screen>
  )
}

const styles = StyleSheet.create({
  kicker: { color: color.muted, fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  count: { color: color.text, fontSize: 48, fontWeight: '600', letterSpacing: -1 },
  lead: { color: color.muted, fontSize: 15, lineHeight: 21 },
  row: {
    minHeight: 64,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: color.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: color.text, fontSize: 17, fontWeight: '600' },
  meta: { color: color.muted, fontSize: 14 },
  chevron: { color: color.office, fontSize: 28, lineHeight: 32 },
})
