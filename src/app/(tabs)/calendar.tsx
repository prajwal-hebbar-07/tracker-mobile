import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Share, StyleSheet, Text } from 'react-native'
import { Legend, MonthHeat } from '@/components/MonthHeat'
import { Screen } from '@/components/Screen'
import { Button, PeriodNav, text } from '@/components/ui'
import { formatMinutes, formatMonth, monthReport, summarize, todayKey } from '@/logic'
import { useDays } from '@/store'

export default function CalendarScreen() {
  const params = useLocalSearchParams<{ month?: string }>()
  const month = typeof params.month === 'string' && /^\d{4}-\d{2}$/.test(params.month) ? params.month : ''
  // Re-key on the param so a jump from Today or Report lands on that month.
  return <CalendarBody key={month || 'now'} opening={month} />
}

function CalendarBody({ opening }: { opening: string }) {
  const router = useRouter()
  const today = todayKey()
  const [year0, month0] = (opening || today.slice(0, 7)).split('-').map(Number)
  const [cursor, setCursor] = useState({ year: year0, month: month0 - 1 })
  const { days } = useDays()
  const prefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`
  const summary = summarize(days, { today, prefix })
  const isCurrent = prefix === today.slice(0, 7)

  function shift(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
  }

  return (
    <Screen>
      <PeriodNav
        noun="month"
        label={formatMonth(cursor.year, cursor.month)}
        hint={isCurrent ? undefined : 'Back to this month'}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        onReset={isCurrent ? undefined : () => setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 })}
      />
      <MonthHeat
        year={cursor.year}
        month={cursor.month}
        days={days}
        onPick={(date) => router.push({ pathname: '/day', params: { date } })}
      />
      <Legend />
      <Text selectable style={[text.muted, styles.summary]}>
        {summary.office} office · {summary.wfh} home · {summary.leave} leave · {formatMinutes(summary.minutes)}
      </Text>
      <Button
        label="Share month"
        icon="share-variant-outline"
        variant="ghost"
        onPress={() => Share.share({ message: monthReport(days, cursor.year, cursor.month, today) }).catch(() => undefined)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  summary: { textAlign: 'center' },
})
