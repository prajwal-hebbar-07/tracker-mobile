import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { Button, Chip, text } from '@/components/ui'
import { leaveTypes, type LeaveType } from '@logbook/core'
import { color, leaveIcon, radius } from '@/theme'

// Pick a type, optionally add a note, then Save. Nothing is recorded until Save.
export function LeaveForm({
  initialType,
  initialNote = '',
  onCancel,
  onSave,
}: {
  initialType?: LeaveType
  initialNote?: string
  onCancel: () => void
  onSave: (leaveType: LeaveType, note: string) => void
}) {
  const [leaveType, setLeaveType] = useState<LeaveType | undefined>(initialType)
  const [note, setNote] = useState(initialNote)

  return (
    <View style={styles.wrap}>
      <Text style={text.label}>Type of leave</Text>
      <View style={styles.chips}>
        {leaveTypes.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            icon={leaveIcon[item.id]}
            tint={color.leave}
            selected={leaveType === item.id}
            onPress={() => setLeaveType(item.id)}
          />
        ))}
      </View>
      {leaveType ? (
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a note (optional): reason, approval…"
          placeholderTextColor={color.faint}
          maxLength={280}
          multiline
          style={styles.note}
        />
      ) : null}
      <View style={styles.row}>
        <Button label="Cancel" grow onPress={onCancel} />
        <Button
          label="Save leave"
          icon="check"
          variant="primary"
          tint={color.leave}
          grow
          disabled={!leaveType}
          onPress={() => leaveType && onSave(leaveType, note.trim().slice(0, 280))}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: {
    minHeight: 88,
    borderRadius: radius.md,
    padding: 14,
    color: color.text,
    backgroundColor: color.raised,
    borderWidth: 1,
    borderColor: color.line,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: 8 },
})
