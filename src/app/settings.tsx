import Constants from 'expo-constants'
import * as Updates from 'expo-updates'
import { useState } from 'react'
import { Share, StyleSheet, Text, TextInput, View } from 'react-native'
import { useDialog } from '@/components/Dialog'
import { Screen } from '@/components/Screen'
import { Button, Section, text } from '@/components/ui'
import { cleanDays, formatLong, plural, toCsv, type Days } from '@/logic'
import { useDays } from '@/store'
import { color, radius } from '@/theme'

export default function SettingsScreen() {
  const { days, replaceAll } = useDays()
  const keys = Object.keys(days).sort()

  return (
    <Screen inset>
      <Text style={text.muted}>
        {plural(keys.length, 'day')} recorded
        {keys.length ? `, ${formatLong(keys[0])} to ${formatLong(keys[keys.length - 1])}` : ''}. Stored only on this phone.
      </Text>
      <Export days={days} />
      <Restore onRestore={replaceAll} />
      <UpdateCheck />
      <Text style={[text.faint, styles.version]}>Logbook {Constants.expoConfig?.version ?? ''}</Text>
    </Screen>
  )
}

function Export({ days }: { days: Days }) {
  const [message, setMessage] = useState('')

  async function share(body: string) {
    try {
      await Share.share({ message: body })
    } catch {
      setMessage('Sharing failed. Nothing was changed.')
    }
  }

  return (
    <Section title="Export">
      <Button label="Share as spreadsheet (CSV)" icon="file-delimited-outline" onPress={() => share(toCsv(days))} />
      <Button label="Share backup (JSON)" icon="database-export-outline" onPress={() => share(JSON.stringify(days))} />
      {message ? <Text style={text.danger}>{message}</Text> : null}
    </Section>
  )
}

function Restore({ onRestore }: { onRestore: (days: Days) => void }) {
  const [open, setOpen] = useState(false)
  const [paste, setPaste] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [dialog, show] = useDialog()

  function restore() {
    let parsed: unknown
    try {
      parsed = JSON.parse(paste)
    } catch {
      setMessage({ ok: false, text: 'That text is not a backup. Paste the JSON from “Share backup”.' })
      return
    }
    const cleaned = cleanDays(parsed)
    if (!cleaned || Object.keys(cleaned).length === 0) {
      setMessage({ ok: false, text: 'Nothing in that backup could be read. The log was left as it is.' })
      return
    }
    const count = Object.keys(cleaned).length
    show({
      title: 'Replace the log on this phone?',
      message: `${plural(count, 'day')} will replace everything stored now.`,
      icon: 'backup-restore',
      action: {
        label: 'Replace',
        destructive: true,
        onPress: () => {
          onRestore(cleaned)
          setPaste('')
          setOpen(false)
          setMessage({ ok: true, text: `Restored ${plural(count, 'day')}.` })
        },
      },
    })
  }

  return (
    <Section title="Restore">
      {open ? (
        <>
          <TextInput
            value={paste}
            onChangeText={setPaste}
            placeholder="Paste a backup here"
            placeholderTextColor={color.faint}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.paste}
          />
          <View style={styles.row}>
            <Button label="Cancel" grow onPress={() => setOpen(false)} />
            <Button label="Restore" icon="backup-restore" variant="danger" grow disabled={!paste.trim()} onPress={restore} />
          </View>
        </>
      ) : (
        <Button label="Restore from backup" icon="backup-restore" onPress={() => setOpen(true)} />
      )}
      {message ? <Text style={message.ok ? styles.ok : text.danger}>{message.text}</Text> : null}
      {dialog}
    </Section>
  )
}

function UpdateCheck() {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function check() {
    if (__DEV__ || !Updates.isEnabled) {
      setMessage('This copy does not download updates. Expo Go runs whatever project you open; the installed Android build updates itself after a push to the repo.')
      return
    }
    setBusy(true)
    try {
      const update = await Updates.checkForUpdateAsync()
      if (!update.isAvailable) {
        setMessage('Already up to date.')
        return
      }
      await Updates.fetchUpdateAsync()
      setMessage('Update downloaded. Restarting…')
      await Updates.reloadAsync()
    } catch (error) {
      const detail = error instanceof Error ? error.message : ''
      if (/Expo Go|development|not supported|not enabled/i.test(detail)) {
        setMessage('This copy does not download updates. Install the Android build, then pushes to the repo update that build.')
        return
      }
      setMessage(detail || 'Could not check for an update.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Updates">
      <Button label={busy ? 'Checking…' : 'Check for update'} icon="cloud-download-outline" disabled={busy} onPress={check} />
      {message ? <Text style={text.muted}>{message}</Text> : null}
    </Section>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  paste: {
    minHeight: 140,
    borderRadius: radius.md,
    padding: 14,
    color: color.text,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  ok: { color: color.success, fontSize: 14, lineHeight: 20 },
  version: { textAlign: 'center' },
})
