import { DayEditor } from '@/components/DayEditor'
import { Screen } from '@/components/Screen'
import { formatMinutes, summarize, todayKey } from '@/logic'
import { useDays } from '@/store'
import { color } from '@/theme'
import { StyleSheet, Text } from 'react-native'

export default function TodayScreen() {
  const today = todayKey()
  const { days, generation, setDay } = useDays()
  const month = summarize(days, { today, prefix: today.slice(0, 7) })

  return (
    <Screen>
      <DayEditor key={`${today}:${generation}`} date={today} day={days[today]} onChange={(day) => setDay(today, day)} />
      <Text style={styles.summary}>
        This month · {month.office} office · {month.wfh} WFH · {month.leave} leave · {formatMinutes(month.minutes)}
      </Text>
      <Text style={styles.meta}>
        Weekdays filled {month.weekdaysMarked} of {month.weekdays}
        {month.officeMissing > 0 ? ` · ${month.officeMissing} office day${month.officeMissing === 1 ? '' : 's'} missing hours` : ''}
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  summary: { color: color.text, fontSize: 15, lineHeight: 21 },
  meta: { color: color.muted, fontSize: 14, lineHeight: 20 },
})
