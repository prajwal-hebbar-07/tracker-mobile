import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Icon, IconButton } from '@/components/ui'
import { timeNow } from '@/logic'
import { color, radius } from '@/theme'

const hours = Array.from({ length: 24 }, (_, hour) => hour)
const minutes = Array.from({ length: 12 }, (_, index) => index * 5)
const pad = (value: number) => String(value).padStart(2, '0')

function split(value?: string): { hour: number; minute: number } {
  const [hour, minute] = (value ?? timeNow()).split(':').map(Number)
  return { hour, minute }
}

// A clock field that opens a grid picker: no keyboard, no format to get wrong.
export function TimeField({
  label,
  value,
  invalid = false,
  onChange,
}: {
  label: string
  value?: string
  invalid?: boolean
  onChange: (value: string | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <View style={styles.field}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} time, ${value ?? 'not set'}`}
          onPress={() => setOpen(true)}
          android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
          style={[styles.box, invalid && styles.boxBad]}
        >
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.value, !value && styles.placeholder]}>{value ?? '--:--'}</Text>
        </Pressable>
        <Button label="Now" compact onPress={() => onChange(timeNow())} accessibilityLabel={`Set ${label} to now`} />
      </View>
      {open ? (
        <TimePicker
          label={label}
          value={value}
          onClose={() => setOpen(false)}
          onPick={(next) => {
            onChange(next)
            setOpen(false)
          }}
        />
      ) : null}
    </>
  )
}

function TimePicker({
  label,
  value,
  onClose,
  onPick,
}: {
  label: string
  value?: string
  onClose: () => void
  onPick: (value: string | undefined) => void
}) {
  const start = split(value)
  const [hour, setHour] = useState(start.hour)
  const [minute, setMinute] = useState(start.minute)
  const { bottom } = useSafeAreaInsets()

  function nudge(delta: number) {
    const total = (hour * 60 + minute + delta + 1440) % 1440
    setHour(Math.floor(total / 60))
    setMinute(total % 60)
  }

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: 16 + bottom }]}>
          <View style={styles.head}>
            <Text style={styles.title}>{label} time</Text>
            <IconButton icon="close" label="Close" onPress={onClose} tint={color.muted} />
          </View>
          <View style={styles.readout}>
            <IconButton icon="minus" label="One minute earlier" onPress={() => nudge(-1)} tint={color.office} />
            <Text style={styles.big}>
              {pad(hour)}:{pad(minute)}
            </Text>
            <IconButton icon="plus" label="One minute later" onPress={() => nudge(1)} tint={color.office} />
          </View>

          <Text style={styles.gridLabel}>Hour</Text>
          <View style={styles.grid}>
            {hours.map((item) => (
              <Cell key={item} label={pad(item)} selected={item === hour} onPress={() => setHour(item)} />
            ))}
          </View>
          <Text style={styles.gridLabel}>Minute</Text>
          <View style={styles.grid}>
            {minutes.map((item) => (
              <Cell key={item} label={pad(item)} selected={item === minute} onPress={() => setMinute(item)} />
            ))}
          </View>

          <View style={styles.actions}>
            {value ? <Button label="Clear" variant="danger" onPress={() => onPick(undefined)} /> : null}
            <Button
              label="Now"
              icon="clock-outline"
              onPress={() => {
                const now = split(timeNow())
                setHour(now.hour)
                setMinute(now.minute)
              }}
            />
            <Button label="Set" icon="check" variant="primary" grow onPress={() => onPick(`${pad(hour)}:${pad(minute)}`)} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

function Cell({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <View style={styles.cellWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={[styles.cell, selected && styles.cellOn]}
      >
        <Text style={[styles.cellText, selected && styles.cellTextOn]}>{label}</Text>
      </Pressable>
    </View>
  )
}

export function Duration({ minutes: mins }: { minutes: number | null }) {
  return (
    <View style={styles.duration}>
      <Icon name="timer-outline" size={18} tint={color.muted} />
      <Text style={styles.durationText}>
        {mins == null ? 'Set both times to see hours' : `${Math.floor(mins / 60)}h ${pad(mins % 60)}m worked`}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  box: {
    flex: 1,
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.raised,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  boxBad: { borderColor: color.danger },
  label: { color: color.muted, fontSize: 14, fontWeight: '600' },
  value: { color: color.text, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  placeholder: { color: color.faint },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: color.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: color.line,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: color.text, fontSize: 18, fontWeight: '700' },
  readout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  big: { color: color.text, fontSize: 48, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  gridLabel: { color: color.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  cellWrap: { width: '16.66%', padding: 3 },
  cell: {
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.raised,
  },
  cellOn: { backgroundColor: color.office },
  cellText: { color: color.text, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  cellTextOn: { color: color.ink },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  durationText: { color: color.muted, fontSize: 15 },
})
