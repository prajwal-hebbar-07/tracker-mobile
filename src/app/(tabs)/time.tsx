import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MonthHeat } from '@/components/MonthHeat'
import { Screen } from '@/components/Screen'
import { formatMinutes, summarize, todayKey } from '@/logic'
import { useDays } from '@/store'
import { color, toneColor } from '@/theme'

const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

export default function TimeScreen() {
  const today = todayKey()
  const [year, setYear] = useState(Number(today.slice(0, 4)))
  const { days } = useDays()
  const all = summarize(days, { today })
  const yearSummary = summarize(days, { today, prefix: String(year) })
  const router = useRouter()

  return (
    <Screen>
      <Text style={styles.kicker}>From home</Text>
      <Text style={styles.count}>{all.wfh}</Text>
      <Text style={styles.lead}>
        {all.wfh === 1 ? 'day' : 'days'} worked from home · {yearSummary.wfh} in {year}
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

      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous year" onPress={() => setYear((value) => value - 1)} style={styles.arrow}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.year}>{year}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next year" onPress={() => setYear((value) => value + 1)} style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <Text style={styles.meta}>
        {yearSummary.office} office · {yearSummary.wfh} from home · {yearSummary.leave} leave · {formatMinutes(yearSummary.minutes)}
      </Text>
      <Text style={styles.section}>Office hours</Text>
      <HoursBars months={yearSummary.months} />
      <Legend />
      {Array.from({ length: 12 }, (_, month) => (
        <MonthHeat
          key={month}
          titled
          year={year}
          month={month}
          days={days}
          onPick={(date) => router.push({ pathname: '/day', params: { date } })}
        />
      ))}
    </Screen>
  )
}

function HoursBars({ months: values }: { months: number[] }) {
  const max = Math.max(...values, 1)
  const empty = values.every((mins) => mins === 0)
  if (empty) return <Text style={styles.meta}>No office hours this year.</Text>
  return (
    <View style={styles.chart}>
      {values.map((mins, index) => (
        <View key={months[index] + index} style={styles.barCol}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { height: mins === 0 ? 0 : Math.max(4, (mins / max) * 72) }]} />
          </View>
          <Text style={styles.barLabel}>{months[index]}</Text>
        </View>
      ))}
    </View>
  )
}

function Legend() {
  const items = [
    ['Office', toneColor['office-full']],
    ['Short', toneColor['office-short']],
    ['No clock', toneColor['office-open']],
    ['WFH', toneColor.wfh],
    ['Leave', toneColor.leave],
    ['Empty', toneColor.none],
  ] as const
  return (
    <View style={styles.legend}>
      {items.map(([label, swatch]) => (
        <View key={label} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: swatch }]} />
          <Text style={styles.legendText}>{label}</Text>
        </View>
      ))}
    </View>
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
  meta: { color: color.muted, fontSize: 14, lineHeight: 20 },
  chevron: { color: color.office, fontSize: 28, lineHeight: 32 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  year: { color: color.text, fontSize: 28, fontWeight: '600' },
  arrow: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: color.office, fontSize: 28, lineHeight: 32 },
  section: { color: color.text, fontSize: 18, fontWeight: '600', marginTop: 8 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 96 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  barFill: { width: '100%', backgroundColor: color.office, borderRadius: 4 },
  barLabel: { color: color.faint, fontSize: 11, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { color: color.muted, fontSize: 12 },
})
