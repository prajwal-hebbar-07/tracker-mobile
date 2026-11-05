import { Tabs } from 'expo-router'
import { color } from '@/theme'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: color.bg },
        headerTintColor: color.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
        tabBarStyle: { backgroundColor: color.bg, borderTopColor: color.line },
        tabBarActiveTintColor: color.office,
        tabBarInactiveTintColor: color.muted,
        tabBarIcon: () => null,
        tabBarIconStyle: { width: 0, height: 0 },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Work' }} />
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="time" options={{ title: 'Time' }} />
    </Tabs>
  )
}
