import type { Tone } from '@/logic'

export const color = {
  bg: '#10120F',
  card: '#1B1E18',
  line: '#2C3128',
  text: '#F3F1EA',
  muted: '#9C978C',
  faint: '#6E6A60',
  office: '#E2A23A',
  ink: '#16140F',
  danger: '#E07A6A',
}

export const toneColor: Record<Tone, string> = {
  none: '#262922',
  wfh: '#7EAA9C',
  leave: '#D17B6A',
  'office-open': '#6A5428',
  'office-short': '#8C6A2E',
  'office-mid': '#C4923A',
  'office-full': '#F0C56A',
}

export function inkFor(name: Tone): string {
  if (name === 'none' || name === 'office-open' || name === 'office-short') return color.text
  return color.ink
}
