import { DarkTheme, Tabs, ThemeProvider } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'
import { DaysProvider, useDays } from '@/store'
import { color, toneColor } from '@/theme'

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: color.bg,
    card: color.bg,
    text: color.text,
    border: color.line,
    primary: color.office,
    notification: toneColor.leave,
  },
}

export default function RootLayout() {
  return (
    <DaysProvider>
      <StatusBar style="light" />
      <ThemeProvider value={navTheme}>
        <Gate />
      </ThemeProvider>
    </DaysProvider>
  )
}

function Gate() {
  const { ready, writable, error } = useDays()
  if (!ready) {
    return (
      <View style={styles.boot}>
        <Text style={styles.bootText}>Opening log…</Text>
      </View>
    )
  }
  if (!writable) {
    return (
      <View style={styles.boot}>
        <Text style={styles.bootTitle}>Log unavailable</Text>
        <Text style={styles.bootText}>{error}</Text>
      </View>
    )
  }
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
      <Tabs.Screen name="log" options={{ title: 'Logs' }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 8,
  },
  bootTitle: { color: color.text, fontSize: 22, fontWeight: '600' },
  bootText: { color: color.muted, fontSize: 16, textAlign: 'center', lineHeight: 22 },
})
