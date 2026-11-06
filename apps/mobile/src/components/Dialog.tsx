import { useState, type ReactNode } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Button, Icon } from '@/components/ui'
import { color, type IconName } from '@/theme'

export type DialogSpec = {
  title: string
  message?: string
  icon?: IconName
  // Without an action the dialog is a notice with a single OK.
  action?: { label: string; destructive?: boolean; onPress: () => void }
}

// Themed replacement for Alert.alert. Render `dialog` inside the component that calls `show`,
// so it opens over whatever screen or sheet that component lives in.
export function useDialog(): [ReactNode, (spec: DialogSpec) => void] {
  const [spec, setSpec] = useState<DialogSpec | null>(null)
  const close = () => setSpec(null)
  const dialog = spec ? (
    <Modal transparent visible animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Dismiss" onPress={close} />
        <View style={styles.card} accessibilityRole="alert">
          {spec.icon ? (
            <View style={[styles.icon, { backgroundColor: `${spec.action?.destructive ? color.danger : color.office}22` }]}>
              <Icon name={spec.icon} size={24} tint={spec.action?.destructive ? color.danger : color.office} />
            </View>
          ) : null}
          <Text style={styles.title}>{spec.title}</Text>
          {spec.message ? <Text style={styles.message}>{spec.message}</Text> : null}
          <View style={styles.actions}>
            {spec.action ? (
              <>
                <Button label="Cancel" grow onPress={close} />
                <Button
                  label={spec.action.label}
                  variant="primary"
                  tint={spec.action.destructive ? color.danger : color.office}
                  grow
                  onPress={() => {
                    const run = spec.action?.onPress
                    close()
                    run?.()
                  }}
                />
              </>
            ) : (
              <Button label="OK" variant="primary" grow onPress={close} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  ) : null
  return [dialog, setSpec]
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.65)' },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: color.card,
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: color.line,
    padding: 20,
    gap: 8,
  },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { color: color.text, fontSize: 20, fontWeight: '700' },
  message: { color: color.muted, fontSize: 15, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
})
