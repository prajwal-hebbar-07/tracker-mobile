import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Share, StyleSheet, Text, View } from 'react-native'
import { ExcelExport } from '@/components/ExcelExport'
import { LeaveList } from '@/components/LeaveList'
import { Screen } from '@/components/Screen'
import { Button, PeriodNav, Section, text } from '@/components/ui'
import { addDays, formatMinutes, leaveCounts, leaveTypes, summarize, todayKey, yearReport } from '@logbook/core'
import { useDays } from '@/store'
import { color } from '@/theme'

const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Date(2000, index, 1).toLocaleDateString(undefined, { month: 'short' }),
)

export default function ReportScreen() {
  const router = useRouter()
  const today = todayKey()
  const thisYear = Number(today.slice(0, 4))
  const [year, setYear] = useState(thisYear)
  const { days } = useDays()
  const summary = summarize(days, { today, prefix: String(year) })
  const counts = leaveCounts(days, String(year))
  const months = monthNames
    .map((name, index) => {
      const key = `${year}-${String(index + 1).padStart(2, '0')}`
      return { name, key, ...summarize(days, { today, prefix: key }) }
    })
    .filter((month) => month.office + month.wfh + month.leave > 0)
  const leaveLine = [
    ...leaveTypes.filter((item) => counts[item.id] > 0).map((item) => `${item.label} ${counts[item.id]}`),
    ...(counts.unmarked > 0 ? [`Untyped ${counts.unmarked}`] : []),
  ].join(' · ')

  return (
    <Screen>
      <PeriodNav
        noun="year"
        label={String(year)}
        hint={year === thisYear ? undefined : 'Back to this year'}
        onPrev={() => setYear(year - 1)}
        onNext={() => setYear(year + 1)}
        onReset={year === thisYear ? undefined : () => setYear(thisYear)}
      />

      <View style={styles.totals}>
        <Total label="Office" value={String(summary.office)} />
        <Total label="Home" value={String(summary.wfh)} />
        <Total label="Leave" value={String(summary.leave)} />
        <Total label="Hours" value={String(Math.round(summary.minutes / 60))} />
      </View>
      <Text style={[text.faint, styles.center]}>
        Weekdays logged {summary.weekdaysMarked} of {summary.weekdays}
      </Text>

      <Section title="By month">
        {months.length === 0 ? (
          <Text style={text.muted}>Nothing logged in {year}.</Text>
        ) : (
          <View>
            <View style={styles.tr}>
              <Text style={[styles.month, styles.th]}>Month</Text>
              <Text style={[styles.cell, styles.th]}>Office</Text>
              <Text style={[styles.cell, styles.th]}>Home</Text>
              <Text style={[styles.cell, styles.th]}>Leave</Text>
              <Text style={[styles.hours, styles.th]}>Hours</Text>
            </View>
            {months.map((month) => (
              <Pressable
                key={month.key}
                accessibilityRole="button"
                accessibilityLabel={`${month.name}: ${month.office} office, ${month.wfh} home, ${month.leave} leave. Open calendar.`}
                onPress={() => router.navigate({ pathname: '/calendar', params: { month: month.key } })}
                style={[styles.tr, styles.rule]}
              >
                <Text style={styles.month}>{month.name}</Text>
                <Text style={styles.cell}>{month.office}</Text>
                <Text style={styles.cell}>{month.wfh}</Text>
                <Text style={styles.cell}>{month.leave}</Text>
                <Text style={styles.hours}>{month.minutes ? formatMinutes(month.minutes) : '—'}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Section>

      <Section title="Leave">
        <Button
          label="Plan leave in advance"
          icon="calendar-range"
          tint={color.leave}
          onPress={() => router.push({ pathname: '/apply-leave', params: { from: addDays(today, 1) } })}
        />
        {leaveLine ? <Text style={text.muted}>{leaveLine}</Text> : null}
        <LeaveList year={year} />
      </Section>

      <Section title="Share the report">
        <Button
          label={`Share ${year} as text`}
          icon="share-variant-outline"
          onPress={() => Share.share({ message: yearReport(days, year, today) }).catch(() => undefined)}
        />
        <ExcelExport key={year} year={year} />
      </Section>
    </Screen>
  )
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.total}>
      <Text selectable style={styles.totalValue}>
        {value}
      </Text>
      <Text style={text.faint}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  totals: { flexDirection: 'row' },
  total: { flex: 1, alignItems: 'center', gap: 2 },
  totalValue: { color: color.text, fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center', marginTop: -8 },
  tr: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  rule: { borderTopWidth: 1, borderTopColor: color.line },
  th: { color: color.faint, fontSize: 12, fontWeight: '700' },
  month: { flex: 1.2, color: color.text, fontSize: 15 },
  cell: { flex: 1, color: color.text, fontSize: 15, textAlign: 'center', fontVariant: ['tabular-nums'] },
  hours: { flex: 1.5, color: color.text, fontSize: 15, textAlign: 'right', fontVariant: ['tabular-nums'] },
})
