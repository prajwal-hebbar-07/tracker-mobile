import type { Kind, Tone } from '@logbook/core'

// The phone's palette (apps/mobile/src/theme.ts), as terminal truecolor.
export const color = {
  text: '#F3F1EA',
  muted: '#A29D91',
  faint: '#6E6A60',
  line: '#3A3F35',
  office: '#E8A93E',
  wfh: '#7EB8A6',
  leave: '#E2806C',
  ink: '#16140F',
  danger: '#EE7B6B',
  success: '#8CC48B',
}

export const toneColor: Record<Tone, string> = {
  none: '#262A23',
  wfh: '#5F9A88',
  leave: '#C9705F',
  office: '#E8A93E',
  'office-open': '#5B4824',
}

export const kindMeta: Record<Kind, { glyph: string; tint: string }> = {
  office: { glyph: '■', tint: color.office },
  wfh: { glyph: '⌂', tint: color.wfh },
  leave: { glyph: '☀', tint: color.leave },
}
