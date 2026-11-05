import type { MaterialDesignIconsIconName } from '@react-native-vector-icons/material-design-icons'
import type { Kind, LeaveType, Tone } from '@/logic'

export type IconName = MaterialDesignIconsIconName

// Dark only: app.json pins userInterfaceStyle to dark, so there is no light table.
export const color = {
  bg: '#0E100D',
  card: '#181B16',
  raised: '#21251E',
  line: '#2C3128',
  text: '#F3F1EA',
  muted: '#A29D91',
  faint: '#6E6A60',
  office: '#E8A93E',
  wfh: '#7EB8A6',
  leave: '#E2806C',
  leaveSoft: '#3A221D',
  ink: '#16140F',
  danger: '#EE7B6B',
  dangerSoft: '#3A1F1B',
  success: '#8CC48B',
}

export const radius = { sm: 10, md: 14, pill: 999 }

export const toneColor: Record<Tone, string> = {
  none: '#1C1F1A',
  wfh: '#5F9A88',
  leave: '#C9705F',
  office: '#E8A93E',
  'office-open': '#5B4824',
}

export function inkFor(name: Tone): string {
  return name === 'office' || name === 'wfh' ? color.ink : color.text
}

export const kindMeta: Record<Kind, { label: string; short: string; icon: IconName; tint: string }> = {
  office: { label: 'Office', short: 'Office', icon: 'office-building-outline', tint: color.office },
  wfh: { label: 'Work from home', short: 'Home', icon: 'home-outline', tint: color.wfh },
  leave: { label: 'Leave', short: 'Leave', icon: 'palm-tree', tint: color.leave },
}

export const leaveIcon: Record<LeaveType, IconName> = {
  personal: 'beach',
  sick: 'thermometer',
  early: 'clock-fast',
  lop: 'cash-remove',
}
