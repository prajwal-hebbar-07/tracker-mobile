import { Link } from 'expo-router'
import * as Updates from 'expo-updates'
import { useState } from 'react'
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { cleanDays, formatMinutes, leaveCounts, leaveTypes, summarize, todayKey, type Days } from '@/logic'
import { useDays } from '@/store'
import { color } from '@/theme'

export default function DashboardScreen() {
  const today = todayKey()
  const year = today.slice(0, 4)
  const { days, replaceAll } = useDays()
  const yearSummary = summarize(days, { today, prefix: year })
  const all = summarize(days, { today })
  const leaves = leaveCounts(days, year)

  return (
    <Screen>
      <Text style={styles.section}>{year}</Text>
      <View style={styles.stats}>
        <Stat label="Office" value={String(yearSummary.office)} />
        <Stat label="From home" value={String(yearSummary.wfh)} />
        <Stat label="Leave" value={String(yearSummary.leave)} />
        <Stat label="Hours" value={formatMinutes(yearSummary.minutes)} />
      </View>
      <Text style={styles.meta}>
        Weekdays filled {yearSummary.weekdaysMarked} of {yearSummary.weekdays}
        {yearSummary.officeWithHours > 0
          ? ` · average ${formatMinutes(Math.round(yearSummary.minutes / yearSummary.officeWithHours))} on clocked office days`
          : ''}
      </Text>
      {yearSummary.officeMissing > 0 ? (
        <Text style={styles.meta}>{yearSummary.officeMissing} office days have no complete clock times.</Text>
      ) : null}

      <Text style={styles.section}>All time</Text>
      <View style={styles.stats}>
        <Stat label="Office" value={String(all.office)} />
        <Stat label="From home" value={String(all.wfh)} />
        <Stat label="Leave" value={String(all.leave)} />
        <Stat label="Hours" value={formatMinutes(all.minutes)} />
      </View>

      <Text style={styles.section}>Leaves in {year}</Text>
      {leaveTypes.map((item) => (
        <View key={item.id} style={styles.leaveRow}>
          <Text style={styles.leaveLabel}>{item.label}</Text>
          <Text style={styles.leaveValue}>{leaves[item.id]}</Text>
        </View>
      ))}
      {leaves.unmarked > 0 ? (
        <View style={styles.leaveRow}>
          <Text style={styles.leaveLabel}>Leave</Text>
          <Text style={styles.leaveValue}>{leaves.unmarked}</Text>
        </View>
      ) : null}
      <Link href="/leaves" asChild>
        <Pressable accessibilityRole="button" style={styles.leaveRow}>
          <Text style={styles.leaveLabel}>All leave taken</Text>
          <Text style={styles.leaveLink}>{all.leave} ›</Text>
        </Pressable>
      </Link>

      <Backup days={days} onRestore={replaceAll} />
      <UpdateCheck />
    </Screen>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function Backup({ days, onRestore }: { days: Days; onRestore: (days: Days) => void }) {
  const [open, setOpen] = useState(false)
  const [paste, setPaste] = useState('')
  const [message, setMessage] = useState('')

  async function exportBackup() {
    try {
      await Share.share({ message: JSON.stringify(days) })
    } catch {
      setMessage('The backup could not be shared.')
    }
  }

  function restore() {
    let parsed: unknown
    try {
      parsed = JSON.parse(paste)
    } catch {
      setMessage('That text is not JSON.')
      return
    }
    const cleaned = cleanDays(parsed)
    if (!cleaned || (paste.trim() !== '' && Object.keys(cleaned).length === 0)) {
      setMessage('Nothing in that backup could be read. The log was left as it is.')
      return
    }
    const count = Object.keys(cleaned).length
    Alert.alert('Replace the log on this phone?', `${count} days will replace what is stored now.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Replace',
        style: 'destructive',
        onPress: () => {
          onRestore(cleaned)
          setPaste('')
          setOpen(false)
          setMessage(`Restored ${count} days.`)
        },
      },
    ])
  }

  return (
    <View style={styles.block}>
      <Text style={styles.section}>Backup</Text>
      <Text style={styles.meta}>The log stays on this phone. Export it before you reinstall.</Text>
      <Pressable accessibilityRole="button" onPress={exportBackup} style={styles.button}>
        <Text style={styles.buttonText}>Export backup</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => setOpen((value) => !value)} style={styles.button}>
        <Text style={styles.buttonText}>{open ? 'Close restore' : 'Restore backup'}</Text>
      </Pressable>
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
          <Pressable accessibilityRole="button" onPress={restore} style={styles.button}>
            <Text style={styles.buttonText}>Replace log with this backup</Text>
          </Pressable>
        </>
      ) : null}
      {message ? <Text style={styles.meta}>{message}</Text> : null}
    </View>
  )
}

function UpdateCheck() {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function check() {
    if (__DEV__ || !Updates.isEnabled) {
      setMessage('This copy does not download updates. Expo Go runs whatever project you open. The installed Android build updates itself after a push to the repo.')
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
      if (__DEV__ || /Expo Go|development|not supported|not enabled/i.test(detail)) {
        setMessage('This copy does not download updates. Install the Android build, then pushes to the repo update that build.')
        return
      }
      setMessage(detail || 'Could not check for an update.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.block}>
      <Text style={styles.section}>Updates</Text>
      <Text style={styles.meta}>
        A release build checks for a new version when it opens and applies it on the next launch. Use the button to apply one now.
      </Text>
      <Pressable accessibilityRole="button" disabled={busy} onPress={check} style={styles.button}>
        <Text style={styles.buttonText}>{busy ? 'Checking…' : 'Check for update'}</Text>
      </Pressable>
      {message ? <Text style={styles.meta}>{message}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    flexBasis: '46%',
    flexGrow: 1,
    backgroundColor: color.card,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  statValue: { color: color.text, fontSize: 22, fontWeight: '600' },
  statLabel: { color: color.muted, fontSize: 13 },
  meta: { color: color.muted, fontSize: 14, lineHeight: 20 },
  section: { color: color.text, fontSize: 18, fontWeight: '600', marginTop: 8 },
  leaveRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  leaveLabel: { color: color.text, fontSize: 16 },
  leaveValue: { color: color.text, fontSize: 16, fontWeight: '600' },
  leaveLink: { color: color.office, fontSize: 16, fontWeight: '600' },
  block: { gap: 10 },
  button: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    paddingHorizontal: 14,
  },
  buttonText: { color: color.text, fontSize: 15, fontWeight: '600' },
  paste: {
    minHeight: 120,
    borderRadius: 12,
    padding: 14,
    color: color.text,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    fontSize: 13,
    textAlignVertical: 'top',
  },
})
