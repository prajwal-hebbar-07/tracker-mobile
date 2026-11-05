import { useLocalSearchParams, useRouter } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { DayEditor } from '@/components/DayEditor'
import { Screen } from '@/components/Screen'
import { TodayCard } from '@/components/TodayCard'
import { IconButton } from '@/components/ui'
import { addDays, isDateKey, parseDateKey, todayKey } from '@/logic'
import { useDays } from '@/store'
import { color } from '@/theme'

export default function DayScreen() {
  const params = useLocalSearchParams<{ date?: string }>()
  const router = useRouter()
  const today = todayKey()
  const date = typeof params.date === 'string' && isDateKey(params.date) ? params.date : today
  const { days, generation, setDay } = useDays()
  const relative = date === today ? 'Today' : date === addDays(today, -1) ? 'Yesterday' : date === addDays(today, 1) ? 'Tomorrow' : ''
  const year = parseDateKey(date).getFullYear()

  return (
    <Screen inset>
      <View style={styles.nav}>
        <IconButton icon="chevron-left" label="Previous day" tint={color.office} onPress={() => router.setParams({ date: addDays(date, -1) })} />
        <View style={styles.title}>
          <Text style={styles.date}>{parseDateKey(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <Text style={styles.sub}>
            {relative ? `${relative} · ` : ''}
            {year}
          </Text>
        </View>
        <IconButton icon="chevron-right" label="Next day" tint={color.office} onPress={() => router.setParams({ date: addDays(date, 1) })} />
      </View>
      {date === today ? (
        <TodayCard />
      ) : (
        <DayEditor key={`${date}:${generation}`} day={days[date]} onChange={(day) => setDay(date, day)} />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, alignItems: 'center', gap: 2 },
  date: { color: color.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  sub: { color: color.muted, fontSize: 14 },
})
