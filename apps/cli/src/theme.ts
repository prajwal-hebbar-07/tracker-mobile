import type { Kind, Tone } from '@logbook/core'

type Palette = {
  bg: string // the whole terminal behind the panel
  panel: string // the panel itself
  surface: string // raised things on the panel: key caps, the selected row, prompts, empty past days
  line: string
  text: string
  muted: string
  faint: string
  accent: string // tabs, focus and prompts
  office: string
  wfh: string
  leave: string
  danger: string
  success: string
  ink: string // text on a filled accent, office, home or leave colour
  open: string // a day clocked in but not out yet
}

type Theme = { id: string; name: string; palette: Palette; tone?: Partial<Record<Tone, string>> }

// Each palette follows its upstream theme's published colours; Logbook is the phone's (apps/mobile/src/theme.ts).
export const themes: Theme[] = [
  {
    id: 'logbook',
    name: 'Logbook',
    palette: {
      bg: '#0E100D',
      panel: '#181B16',
      surface: '#262A23',
      line: '#3A3F35',
      text: '#F3F1EA',
      muted: '#A29D91',
      faint: '#6E6A60',
      accent: '#E8A93E',
      office: '#E8A93E',
      wfh: '#7EB8A6',
      leave: '#E2806C',
      danger: '#EE7B6B',
      success: '#8CC48B',
      ink: '#16140F',
      open: '#5B4824',
    },
    tone: { wfh: '#5F9A88', leave: '#C9705F' },
  },
  {
    id: 'tokyonight',
    name: 'Tokyo Night',
    palette: {
      bg: '#16161E',
      panel: '#1A1B26',
      surface: '#292E42',
      line: '#3B4261',
      text: '#C0CAF5',
      muted: '#A9B1D6',
      faint: '#565F89',
      accent: '#7AA2F7',
      office: '#E0AF68',
      wfh: '#73DACA',
      leave: '#F7768E',
      danger: '#F7768E',
      success: '#9ECE6A',
      ink: '#1A1B26',
      open: '#5A4A2C',
    },
  },
  {
    id: 'palenight',
    name: 'Palenight',
    palette: {
      bg: '#202331',
      panel: '#292D3E',
      surface: '#34324A',
      line: '#444267',
      text: '#D0D6E8',
      muted: '#A6ACCD',
      faint: '#676E95',
      accent: '#C792EA',
      office: '#FFCB6B',
      wfh: '#89DDFF',
      leave: '#F78C6C',
      danger: '#FF5370',
      success: '#C3E88D',
      ink: '#292D3E',
      open: '#5A4D36',
    },
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    palette: {
      bg: '#11111B',
      panel: '#1E1E2E',
      surface: '#313244',
      line: '#45475A',
      text: '#CDD6F4',
      muted: '#A6ADC8',
      faint: '#6C7086',
      accent: '#CBA6F7',
      office: '#F9E2AF',
      wfh: '#94E2D5',
      leave: '#FAB387',
      danger: '#F38BA8',
      success: '#A6E3A1',
      ink: '#1E1E2E',
      open: '#5C5445',
    },
  },
  {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    palette: {
      bg: '#DCE0E8',
      panel: '#EFF1F5',
      surface: '#CCD0DA',
      line: '#BCC0CC',
      text: '#4C4F69',
      muted: '#6C6F85',
      faint: '#9CA0B0',
      accent: '#8839EF',
      office: '#DF8E1D',
      wfh: '#179299',
      leave: '#FE640B',
      danger: '#D20F39',
      success: '#40A02B',
      ink: '#EFF1F5',
      open: '#ECD3A5',
    },
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox Dark',
    palette: {
      bg: '#1D2021',
      panel: '#282828',
      surface: '#3C3836',
      line: '#504945',
      text: '#EBDBB2',
      muted: '#A89984',
      faint: '#7C6F64',
      accent: '#83A598',
      office: '#FABD2F',
      wfh: '#8EC07C',
      leave: '#FE8019',
      danger: '#FB4934',
      success: '#B8BB26',
      ink: '#282828',
      open: '#5A4A1E',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    palette: {
      bg: '#242933',
      panel: '#2E3440',
      surface: '#3B4252',
      line: '#4C566A',
      text: '#ECEFF4',
      muted: '#D8DEE9',
      faint: '#616E88',
      accent: '#88C0D0',
      office: '#EBCB8B',
      wfh: '#8FBCBB',
      leave: '#D08770',
      danger: '#BF616A',
      success: '#A3BE8C',
      ink: '#2E3440',
      open: '#5B5544',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    palette: {
      bg: '#21222C',
      panel: '#282A36',
      surface: '#343746',
      line: '#44475A',
      text: '#F8F8F2',
      muted: '#BCC2CD',
      faint: '#6272A4',
      accent: '#BD93F9',
      office: '#FFB86C',
      wfh: '#8BE9FD',
      leave: '#FF79C6',
      danger: '#FF5555',
      success: '#50FA7B',
      ink: '#282A36',
      open: '#5C4A37',
    },
  },
  {
    id: 'rose-pine',
    name: 'Rosé Pine',
    palette: {
      bg: '#191724',
      panel: '#1F1D2E',
      surface: '#26233A',
      line: '#403D52',
      text: '#E0DEF4',
      muted: '#908CAA',
      faint: '#6E6A86',
      accent: '#C4A7E7',
      office: '#F6C177',
      wfh: '#9CCFD8',
      leave: '#EBBCBA',
      danger: '#EB6F92',
      success: '#9CCFD8',
      ink: '#191724',
      open: '#5A4A3A',
    },
  },
  {
    id: 'one-dark',
    name: 'One Dark',
    palette: {
      bg: '#21252B',
      panel: '#282C34',
      surface: '#2C313A',
      line: '#3E4451',
      text: '#DCDFE4',
      muted: '#ABB2BF',
      faint: '#5C6370',
      accent: '#61AFEF',
      office: '#E5C07B',
      wfh: '#56B6C2',
      leave: '#D19A66',
      danger: '#E06C75',
      success: '#98C379',
      ink: '#282C34',
      open: '#594C35',
    },
  },
  {
    id: 'kanagawa',
    name: 'Kanagawa',
    palette: {
      bg: '#16161D',
      panel: '#1F1F28',
      surface: '#2A2A37',
      line: '#363646',
      text: '#DCD7BA',
      muted: '#C8C093',
      faint: '#727169',
      accent: '#7E9CD8',
      office: '#E6C384',
      wfh: '#7AA89F',
      leave: '#FFA066',
      danger: '#E46876',
      success: '#98BB6C',
      ink: '#1F1F28',
      open: '#54493A',
    },
  },
  {
    id: 'everforest',
    name: 'Everforest',
    palette: {
      bg: '#232A2E',
      panel: '#2D353B',
      surface: '#343F44',
      line: '#475258',
      text: '#D3C6AA',
      muted: '#9DA9A0',
      faint: '#7A8478',
      accent: '#A7C080',
      office: '#DBBC7F',
      wfh: '#83C092',
      leave: '#E69875',
      danger: '#E67E80',
      success: '#A7C080',
      ink: '#2D353B',
      open: '#55503A',
    },
  },
]

export const defaultTheme = themes[0].id

export function findTheme(id: string | undefined): Theme | undefined {
  return themes.find((theme) => theme.id === id)
}

// The colours in use. Views read these while rendering, so `applyTheme` followed by a re-render repaints everything;
// one-shot commands apply the saved theme before they print.
export const color: Palette = { ...themes[0].palette }
export const toneColor: Record<Tone, string> = { none: '', wfh: '', leave: '', office: '', 'office-open': '' }

export function applyTheme(id: string): void {
  const theme = findTheme(id) ?? themes[0]
  Object.assign(color, theme.palette)
  const { surface, wfh, leave, office, open } = theme.palette
  Object.assign(toneColor, { none: surface, wfh, leave, office, 'office-open': open }, theme.tone)
}

applyTheme(defaultTheme)

export const kindGlyph: Record<Kind, string> = { office: '■', wfh: '⌂', leave: '☀' }

// `a` laid over `b` at `amount` (0 to 1): soft tints such as a range of leave being picked.
export function mix(a: string, b: string, amount: number): string {
  const channel = (hex: string, index: number) => parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16)
  const parts = [0, 1, 2].map((index) => Math.round(channel(a, index) * amount + channel(b, index) * (1 - amount)))
  return `#${parts.map((part) => part.toString(16).padStart(2, '0')).join('')}`
}
