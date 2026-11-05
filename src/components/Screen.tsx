import { type ReactNode } from 'react'
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icon } from '@/components/ui'
import { useDays } from '@/store'
import { color } from '@/theme'

// `inset` pads for the system bar on screens that are not above the tab bar.
export function Screen({ children, footer, inset = false }: { children: ReactNode; footer?: ReactNode; inset?: boolean }) {
  const { error, writable } = useDays()
  const { bottom } = useSafeAreaInsets()
  const pad = inset ? bottom : 0
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: (footer ? 16 : 32) + (footer ? 0 : pad) }]}
        keyboardShouldPersistTaps="handled"
      >
        {writable && error ? (
          <View style={styles.error}>
            <Icon name="alert-circle-outline" size={18} tint={color.danger} />
            <Text selectable style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: 12 + pad }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  content: { padding: 16, gap: 20 },
  error: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: color.dangerSoft,
  },
  errorText: { flex: 1, color: color.danger, fontSize: 14, lineHeight: 20 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: color.line,
    backgroundColor: color.bg,
    gap: 8,
  },
})
