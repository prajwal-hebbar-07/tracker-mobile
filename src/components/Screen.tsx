import { type ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native'
import { useDays } from '@/store'
import { color } from '@/theme'

export function Screen({ children }: { children: ReactNode }) {
  const { error, writable } = useDays()
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {writable && error ? <Text style={styles.error}>{error}</Text> : null}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  error: { color: color.danger, fontSize: 14, lineHeight: 20 },
})
