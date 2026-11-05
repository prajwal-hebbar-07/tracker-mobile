import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons'
import { type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { color, radius, type IconName } from '@/theme'

const ripple = { color: 'rgba(255,255,255,0.08)' }

export function Icon({ name, size = 20, tint = color.text }: { name: IconName; size?: number; tint?: string }) {
  return <MaterialDesignIcons name={name} size={size} color={tint} />
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  label,
  icon,
  onPress,
  variant = 'secondary',
  tint = color.office,
  disabled = false,
  grow = false,
  compact = false,
  accessibilityLabel,
}: {
  label: string
  icon?: IconName
  onPress: () => void
  variant?: Variant
  tint?: string
  disabled?: boolean
  grow?: boolean
  compact?: boolean
  accessibilityLabel?: string
}) {
  const fg =
    variant === 'primary' ? color.ink : variant === 'danger' ? color.danger : variant === 'ghost' ? tint : color.text
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={ripple}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        grow && styles.grow,
        variant === 'primary' && { backgroundColor: tint, borderColor: tint },
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        disabled && styles.disabled,
        pressed && process.env.EXPO_OS !== 'android' && styles.pressed,
      ]}
    >
      {icon ? <Icon name={icon} size={compact ? 18 : 20} tint={variant === 'secondary' ? tint : fg} /> : null}
      <Text numberOfLines={1} style={[styles.buttonText, compact && styles.buttonTextCompact, { color: fg }]}>
        {label}
      </Text>
    </Pressable>
  )
}

export function IconButton({
  icon,
  label,
  onPress,
  tint = color.text,
  disabled = false,
}: {
  icon: IconName
  label: string
  onPress: () => void
  tint?: string
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      android_ripple={{ ...ripple, borderless: true, radius: 22 }}
      style={({ pressed }) => [
        styles.iconButton,
        disabled && styles.disabled,
        pressed && process.env.EXPO_OS !== 'android' && styles.pressed,
      ]}
    >
      <Icon name={icon} size={22} tint={tint} />
    </Pressable>
  )
}

export function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: { label: string; icon?: IconName; onPress: () => void }
  children: ReactNode
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action ? (
          <Pressable
            accessibilityRole="button"
            onPress={action.onPress}
            hitSlop={8}
            style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}
          >
            {action.icon ? <Icon name={action.icon} size={18} tint={color.office} /> : null}
            <Text style={styles.sectionActionText}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  )
}

export function Chip({
  label,
  icon,
  selected,
  tint = color.office,
  onPress,
}: {
  label: string
  icon?: IconName
  selected: boolean
  tint?: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      android_ripple={ripple}
      style={[styles.chip, selected && { borderColor: tint, backgroundColor: `${tint}26` }]}
    >
      {icon ? <Icon name={icon} size={18} tint={selected ? tint : color.muted} /> : null}
      <Text style={[styles.chipText, selected && { color: tint }]}>{label}</Text>
    </Pressable>
  )
}

// ‹ label › stepper for months and years. Tapping the label jumps back to the current period.
export function PeriodNav({
  label,
  hint,
  onPrev,
  onNext,
  onReset,
  noun,
}: {
  label: string
  hint?: string
  onPrev: () => void
  onNext: () => void
  onReset?: () => void
  noun: string
}) {
  return (
    <View style={styles.period}>
      <IconButton icon="chevron-left" label={`Previous ${noun}`} onPress={onPrev} tint={color.office} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={onReset ? `${label}, go to current ${noun}` : label}
        disabled={!onReset}
        onPress={onReset}
        style={styles.periodLabel}
      >
        <Text style={styles.periodText}>{label}</Text>
        {hint ? <Text style={styles.periodHint}>{hint}</Text> : null}
      </Pressable>
      <IconButton icon="chevron-right" label={`Next ${noun}`} onPress={onNext} tint={color.office} />
    </View>
  )
}

export const text = StyleSheet.create({
  body: { color: color.text, fontSize: 16, lineHeight: 22 },
  muted: { color: color.muted, fontSize: 14, lineHeight: 20 },
  faint: { color: color.faint, fontSize: 13, lineHeight: 18 },
  danger: { color: color.danger, fontSize: 14, lineHeight: 20 },
  label: { color: color.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
})

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  buttonCompact: { minHeight: 44, paddingHorizontal: 12, borderRadius: radius.sm },
  grow: { flex: 1 },
  secondary: { backgroundColor: color.raised, borderColor: color.line },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: color.dangerSoft, borderColor: color.dangerSoft },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  buttonTextCompact: { fontSize: 15 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  sectionTitle: { color: color.text, fontSize: 18, fontWeight: '700' },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  sectionActionText: { color: color.office, fontSize: 15, fontWeight: '600' },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.raised,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  chipText: { color: color.text, fontSize: 15, fontWeight: '600' },
  period: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodLabel: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  periodText: { color: color.text, fontSize: 18, fontWeight: '700' },
  periodHint: { color: color.office, fontSize: 12, fontWeight: '600' },
})
