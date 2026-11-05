import { DarkTheme, ThemeProvider } from 'expo-router'
import { Stack } from 'expo-router/stack'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Icon } from '@/components/ui'
import { DaysProvider, useDays } from '@/store'
import { color } from '@/theme'

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: color.bg,
    card: color.bg,
    text: color.text,
    border: color.line,
    primary: color.office,
    notification: color.leave,
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
        <ActivityIndicator color={color.office} />
        <Text style={styles.bootText}>Opening your log…</Text>
      </View>
    )
  }
  if (!writable) {
    return (
      <View style={styles.boot}>
        <Icon name="alert-circle-outline" size={40} tint={color.danger} />
        <Text style={styles.bootTitle}>Log unavailable</Text>
        <Text selectable style={styles.bootText}>
          {error}
        </Text>
      </View>
    )
  }
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: color.bg },
        headerTintColor: color.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: color.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="apply-leave"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [1],
          title: 'Apply leave',
        }}
      />
      <Stack.Screen name="day" options={{ title: 'Day' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings & backup' }} />
    </Stack>
  )
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 10,
  },
  bootTitle: { color: color.text, fontSize: 22, fontWeight: '700' },
  bootText: { color: color.muted, fontSize: 16, textAlign: 'center', lineHeight: 22 },
})
