import { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native'
import { Duration, TimeField } from '@/components/TimeField'
import { Button, Chip, Icon, text } from '@/components/ui'
import { isWeekend, leaveTypes, minutesBetween, type Day, type Kind, type LeaveType } from '@/logic'
import { color, kindMeta, leaveIcon, radius } from '@/theme'

const kinds: Kind[] = ['office', 'wfh', 'leave']

// Edits save as you go; the store writes each change to the phone.
export function DayEditor({ date, day, onChange }: { date: string; day?: Day; onChange: (day: Day | null) => void }) {
  // Times survive a switch to home or leave and back, so a mis-tap does not lose them.
  const [times, setTimes] = useState({ in: day?.in, out: day?.out })
  const [note, setNote] = useState(day?.note ?? '')

  function save(kind: Kind, patch: { in?: string; out?: string; leaveType?: LeaveType; note?: string } = {}) {
    const next: Day = { kind }
    const trimmed = (patch.note ?? note).trim().slice(0, 280)
    if (kind === 'office') {
      const inn = 'in' in patch ? patch.in : times.in
      const out = 'out' in patch ? patch.out : times.out
      if (inn) next.in = inn
      if (out) next.out = out
    }
    if (kind === 'leave') next.leaveType = patch.leaveType ?? day?.leaveType ?? 'personal'
    if (trimmed) next.note = trimmed
    onChange(next)
  }

  function setTime(which: 'in' | 'out', value: string | undefined) {
    setTimes((prev) => ({ ...prev, [which]: value }))
    save('office', { [which]: value })
  }

  function clear() {
    Alert.alert('Clear this day?', 'The record and its note will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setTimes({ in: undefined, out: undefined })
          setNote('')
          onChange(null)
        },
      },
    ])
  }

  const mins = day?.kind === 'office' ? minutesBetween(day.in, day.out) : null
  const backwards = Boolean(day?.kind === 'office' && day.in && day.out && mins == null)

  return (
    <View style={styles.wrap}>
      <View style={styles.section}>
        <View style={styles.kinds}>
          {kinds.map((kind) => {
            const meta = kindMeta[kind]
            const selected = day?.kind === kind
            return (
              <View key={kind} style={styles.kind}>
                <Button
                  label={meta.short}
                  icon={meta.icon}
                  variant={selected ? 'primary' : 'secondary'}
                  tint={meta.tint}
                  onPress={() => save(kind)}
                  accessibilityLabel={`${meta.label}${selected ? ', selected' : ''}`}
                />
              </View>
            )
          })}
        </View>
        {!day ? (
          <Text style={text.muted}>
            {isWeekend(date) ? 'Weekend. Leave it empty unless you worked.' : 'Nothing recorded yet. Pick a type to start.'}
          </Text>
        ) : null}
      </View>

      {day?.kind === 'office' ? (
        <View style={styles.section}>
          <TimeField label="In" value={day.in} onChange={(value) => setTime('in', value)} />
          <TimeField label="Out" value={day.out} invalid={backwards} onChange={(value) => setTime('out', value)} />
          {backwards ? (
            <View style={styles.warn}>
              <Icon name="alert-circle-outline" size={18} tint={color.danger} />
              <Text style={text.danger}>Clock-out is before clock-in.</Text>
            </View>
          ) : (
            <Duration minutes={mins} />
          )}
        </View>
      ) : null}

      {day?.kind === 'leave' ? (
        <View style={styles.chips}>
          {leaveTypes.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              icon={leaveIcon[item.id]}
              tint={color.leave}
              selected={day.leaveType === item.id}
              onPress={() => save('leave', { leaveType: item.id })}
            />
          ))}
        </View>
      ) : null}

      {day ? (
        <TextInput
          value={note}
          onChangeText={(value) => {
            setNote(value)
            save(day.kind, { note: value, leaveType: day.leaveType })
          }}
          placeholder={day.kind === 'leave' ? 'Note: reason, approval…' : 'Note'}
          placeholderTextColor={color.faint}
          maxLength={280}
          multiline
          style={styles.note}
        />
      ) : null}

      {day ? <Button label="Clear day" icon="delete-outline" variant="ghost" tint={color.danger} onPress={clear} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 20 },
  section: { gap: 10 },
  kinds: { flexDirection: 'row', gap: 8 },
  kind: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  note: {
    minHeight: 96,
    borderRadius: radius.md,
    padding: 14,
    color: color.text,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
})
