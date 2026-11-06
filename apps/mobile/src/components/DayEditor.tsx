import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useDialog } from '@/components/Dialog'
import { LeaveForm } from '@/components/LeaveForm'
import { Button, Icon, text } from '@/components/ui'
import { describeDay, type Day, type LeaveType } from '@logbook/core'
import { color, kindMeta, radius } from '@/theme'

// Days other than today only take leave. Office and home days are logged live from Today, so here they are read-only.
export function DayEditor({ day, onChange }: { day?: Day; onChange: (day: Day | null) => void }) {
  const [editing, setEditing] = useState(false)
  const [dialog, show] = useDialog()

  function save(leaveType: LeaveType, note: string) {
    const write = () => {
      onChange({ kind: 'leave', leaveType, ...(note ? { note } : {}) })
      setEditing(false)
    }
    if (!day || day.kind === 'leave') return write()
    show({
      title: 'Replace this day with leave?',
      message: `It is logged as ${describeDay(day)}. That record will be replaced.`,
      icon: 'palm-tree',
      action: { label: 'Replace', destructive: true, onPress: write },
    })
  }

  function remove() {
    show({
      title: 'Remove this leave?',
      message: 'The day goes back to nothing logged.',
      icon: 'delete-outline',
      action: { label: 'Remove', destructive: true, onPress: () => onChange(null) },
    })
  }

  const meta = day ? kindMeta[day.kind] : null

  return (
    <View style={styles.wrap}>
      <View style={styles.record}>
        <Icon name={meta?.icon ?? 'calendar-blank-outline'} size={22} tint={meta?.tint ?? color.faint} />
        <View style={styles.recordText}>
          <Text selectable style={text.body}>
            {day ? describeDay(day) : 'Nothing logged'}
          </Text>
          {day?.kind === 'leave' && day.note ? (
            <Text selectable style={text.muted}>
              {day.note}
            </Text>
          ) : null}
        </View>
      </View>

      {editing ? (
        <LeaveForm
          initialType={day?.kind === 'leave' ? day.leaveType : undefined}
          initialNote={day?.kind === 'leave' ? day.note : undefined}
          onCancel={() => setEditing(false)}
          onSave={save}
        />
      ) : day?.kind === 'leave' ? (
        <View style={styles.row}>
          <Button label="Edit leave" icon="pencil-outline" grow onPress={() => setEditing(true)} />
          <Button label="Remove" icon="delete-outline" variant="danger" grow onPress={remove} />
        </View>
      ) : (
        <Button label="Mark as leave" icon={kindMeta.leave.icon} tint={color.leave} onPress={() => setEditing(true)} />
      )}
      {dialog}
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
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
  },
  recordText: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', gap: 8 },
})
