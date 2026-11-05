import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { useDialog } from '@/components/Dialog'
import { Button, Chip, Icon, text } from '@/components/ui'
import { describeDay, leaveTypes, type Day, type LeaveType } from '@/logic'
import { color, kindMeta, leaveIcon, radius } from '@/theme'

// Days other than today only take leave. Office and home days are logged live from Today, so here they are read-only.
export function DayEditor({ day, onChange }: { day?: Day; onChange: (day: Day | null) => void }) {
  const [note, setNote] = useState(day?.kind === 'leave' ? (day.note ?? '') : '')
  const [dialog, show] = useDialog()

  function saveLeave(leaveType: LeaveType, text = note) {
    const trimmed = text.trim().slice(0, 280)
    onChange({ kind: 'leave', leaveType, ...(trimmed ? { note: trimmed } : {}) })
  }

  function markLeave() {
    if (!day) return saveLeave('personal')
    show({
      title: 'Mark this day as leave?',
      message: `It is logged as ${describeDay(day)}. That record will be replaced.`,
      icon: 'palm-tree',
      action: { label: 'Mark as leave', destructive: true, onPress: () => saveLeave('personal') },
    })
  }

  if (day?.kind !== 'leave') {
    return (
      <View style={styles.wrap}>
        <View style={styles.record}>
          <Icon name={day ? kindMeta[day.kind].icon : 'calendar-blank-outline'} size={22} tint={day ? kindMeta[day.kind].tint : color.faint} />
          <Text selectable style={styles.recordText}>
            {day ? describeDay(day) : 'Nothing logged'}
          </Text>
        </View>
        <Button label="Mark as leave" icon={kindMeta.leave.icon} tint={color.leave} onPress={markLeave} />
        {dialog}
      </View>
    )
  }

  const leaveType = day.leaveType ?? 'personal'
  return (
    <View style={styles.wrap}>
      <View style={styles.chips}>
        {leaveTypes.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            icon={leaveIcon[item.id]}
            tint={color.leave}
            selected={leaveType === item.id}
            onPress={() => saveLeave(item.id)}
          />
        ))}
      </View>
      <TextInput
        value={note}
        onChangeText={(value) => {
          setNote(value)
          saveLeave(leaveType, value)
        }}
        placeholder="Note: reason, approval…"
        placeholderTextColor={color.faint}
        maxLength={280}
        multiline
        style={styles.note}
      />
      <Button label="Remove leave" icon="delete-outline" variant="ghost" tint={color.danger} onPress={() => onChange(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
  },
  recordText: { ...text.body, flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
