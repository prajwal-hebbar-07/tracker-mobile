import { DarkTheme, ThemeProvider } from 'expo-router'
import { Stack } from 'expo-router/stack'
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
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: color.bg },
        headerTintColor: color.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
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
      <Stack.Screen name="leaves" options={{ title: 'Leaves' }} />
      <Stack.Screen name="day" options={{ title: 'Day' }} />
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
    gap: 8,
  },
  bootTitle: { color: color.text, fontSize: 22, fontWeight: '600' },
  bootText: { color: color.muted, fontSize: 16, textAlign: 'center', lineHeight: 22 },
})
