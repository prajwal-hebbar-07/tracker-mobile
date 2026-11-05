import * as Updates from 'expo-updates'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native'
import { MonthHeat } from '@/components/MonthHeat'
import { Screen } from '@/components/Screen'
import { cleanDays, formatMinutes, summarize, todayKey, type Days } from '@/logic'
import { useDays } from '@/store'
import { color, toneColor } from '@/theme'

const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

export default function DashboardScreen() {
  const today = todayKey()
  const [year, setYear] = useState(Number(today.slice(0, 4)))
  const { days, replaceAll } = useDays()
  const yearSummary = summarize(days, { today, prefix: String(year) })
  const all = summarize(days, { today })
  const router = useRouter()

  return (
    <Screen>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous year" onPress={() => setYear((value) => value - 1)} style={styles.arrow}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.year}>{year}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next year" onPress={() => setYear((value) => value + 1)} style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.stats}>
        <Stat label="Office" value={String(yearSummary.office)} />
        <Stat label="WFH" value={String(yearSummary.wfh)} />
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
      <Text style={styles.meta}>
        All time · {all.office} office · {all.wfh} WFH · {all.leave} leave · {formatMinutes(all.minutes)}
      </Text>

      <Text style={styles.section}>Office hours</Text>
      <HoursBars months={yearSummary.months} />

      <Text style={styles.section}>Year</Text>
      <Legend />
      {Array.from({ length: 12 }, (_, month) => (
        <MonthHeat
          key={month}
          titled
          year={year}
          month={month}
          days={days}
          onPick={(date) => router.push({ pathname: '/day', params: { date } })}
        />
      ))}

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

function HoursBars({ months: values }: { months: number[] }) {
  const max = Math.max(...values, 1)
  const empty = values.every((mins) => mins === 0)
  if (empty) return <Text style={styles.meta}>No office hours this year.</Text>
  return (
    <View style={styles.chart}>
      {values.map((mins, index) => (
        <View key={months[index] + index} style={styles.barCol}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { height: mins === 0 ? 0 : Math.max(4, (mins / max) * 72) }]} />
          </View>
          <Text style={styles.barLabel}>{months[index]}</Text>
        </View>
      ))}
    </View>
  )
}

function Legend() {
  const items = [
    ['Office', toneColor['office-full']],
    ['Short', toneColor['office-short']],
    ['No clock', toneColor['office-open']],
    ['WFH', toneColor.wfh],
    ['Leave', toneColor.leave],
    ['Empty', toneColor.none],
  ] as const
  return (
    <View style={styles.legend}>
      {items.map(([label, swatch]) => (
        <View key={label} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: swatch }]} />
          <Text style={styles.legendText}>{label}</Text>
        </View>
      ))}
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
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  year: { color: color.text, fontSize: 28, fontWeight: '600' },
  arrow: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: color.office, fontSize: 28, lineHeight: 32 },
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
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 96 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  barFill: { width: '100%', backgroundColor: color.office, borderRadius: 4 },
  barLabel: { color: color.faint, fontSize: 11, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { color: color.muted, fontSize: 12 },
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
