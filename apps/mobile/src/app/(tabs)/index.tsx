import { Tabs } from 'expo-router'
import { Screen } from '@/components/Screen'
import { TodayCard } from '@/components/TodayCard'
import { parseDateKey, todayKey } from '@logbook/core'

export default function TodayScreen() {
  return (
    <Screen>
      {/* The tab already says "Today", so the header carries the date instead of repeating it. */}
      <Tabs.Screen
        options={{
          headerTitle: parseDateKey(todayKey()).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
        }}
      />
      <TodayCard />
    </Screen>
  )
}
