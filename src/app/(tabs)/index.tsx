import { Tabs, useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Screen } from '@/components/Screen'
import { TodayCard } from '@/components/TodayCard'
import { Icon } from '@/components/ui'
import { parseDateKey, plural, summarize, todayKey } from '@/logic'
import { useDays } from '@/store'
import { color } from '@/theme'

export default function TodayScreen() {
  const router = useRouter()
  const today = todayKey()
  const { days } = useDays()
  const missing = summarize(days, { today, prefix: today.slice(0, 7) }).unmarked.filter((date) => date !== today)

  return (
    <Screen>
      {/* The tab already says "Today", so the header carries the date instead of repeating it. */}
      <Tabs.Screen
        options={{
          headerTitle: parseDateKey(today).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
        }}
      />
      <TodayCard />
      {missing.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate({ pathname: '/calendar', params: { month: today.slice(0, 7) } })}
          android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
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
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color.line,
    overflow: 'hidden',
  },
  nudgeText: { flex: 1, color: color.text, fontSize: 15 },
})
