import { Tabs, useRouter } from 'expo-router'
import { Icon, IconButton } from '@/components/ui'
import { color, type IconName } from '@/theme'

const tab = (title: string, icon: IconName, activeIcon: IconName) => ({
  title,
  tabBarIcon: ({ focused }: { focused: boolean }) => (
    <Icon name={focused ? activeIcon : icon} size={24} tint={focused ? color.office : color.muted} />
  ),
})

export default function TabLayout() {
  const router = useRouter()
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: color.bg },
        headerTintColor: color.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 22, fontWeight: '700' },
        headerTitleAlign: 'left',
        headerRight: () => (
          <IconButton icon="cog-outline" label="Settings and backup" tint={color.muted} onPress={() => router.push('/settings')} />
        ),
        headerRightContainerStyle: { paddingRight: 8 },
        sceneStyle: { backgroundColor: color.bg },
        tabBarStyle: { backgroundColor: color.card, borderTopColor: color.line },
        tabBarActiveTintColor: color.office,
        tabBarInactiveTintColor: color.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={tab('Today', 'clock-outline', 'clock')} />
      <Tabs.Screen name="calendar" options={tab('Calendar', 'calendar-month-outline', 'calendar-month')} />
      <Tabs.Screen name="report" options={tab('Report', 'chart-box-outline', 'chart-box')} />
    </Tabs>
  )
}
