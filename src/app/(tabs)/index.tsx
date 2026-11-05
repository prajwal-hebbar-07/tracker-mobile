import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Screen } from '@/components/Screen'
import { TodayCard } from '@/components/TodayCard'
import { Icon } from '@/components/ui'
import { plural, summarize, todayKey } from '@/logic'
import { useDays } from '@/store'
import { color } from '@/theme'

export default function TodayScreen() {
  const router = useRouter()
  const today = todayKey()
  const { days } = useDays()
  const missing = summarize(days, { today, prefix: today.slice(0, 7) }).unmarked.filter((date) => date !== today)

  return (
    <Screen>
      <TodayCard />
      {missing.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate({ pathname: '/calendar', params: { month: today.slice(0, 7) } })}
          style={styles.nudge}
        >
          <Icon name="calendar-alert" size={18} tint={color.office} />
          <Text style={styles.nudgeText}>{plural(missing.length, 'weekday')} this month not logged</Text>
          <Icon name="chevron-right" size={18} tint={color.faint} />
        </Pressable>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, marginTop: 8 },
  nudgeText: { flex: 1, color: color.muted, fontSize: 15 },
})
