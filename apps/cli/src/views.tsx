import {
  formatLong,
  formatMinutes,
  formatMonth,
  isWeekend,
  leaveCounts,
  leaveLabel,
  leaveTypes,
  minutesBetween,
  minutesSince,
  monthCells,
  plural,
  summarize,
  tone,
  workedHoliday,
  type Day,
  type Days,
} from '@logbook/core'
import { Box, Text, type BoxProps } from 'ink'
import { createContext, useContext, type ReactNode } from 'react'
import { color, kindGlyph, mix, toneColor } from './theme.ts'

// Shared by the interactive view and the one-shot commands, so both look the same.

// The colour behind the views. The interactive panel paints one; one-shot output leaves the terminal's own.
// Ink does not carry a parent's background into a nested border, so cards read it from here.
export const Backdrop = createContext<string | undefined>(undefined)

export function Card({ tint, children, ...props }: BoxProps & { tint?: string; children: ReactNode }) {
  const backdrop = useContext(Backdrop)
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={tint ?? color.line} borderBackgroundColor={backdrop} paddingX={2} {...props}>
      {children}
    </Box>
  )
}

export function Status({ day, now, today }: { day?: Day; now: Date; today: string }) {
  const office = day?.kind === 'office' ? day : null
  const open = Boolean(office?.in) && !office?.out
  const minutes = open && office?.in ? minutesSince(office.in, now) : office ? minutesBetween(office.in, office.out) : null
  const status = !day
    ? isWeekend(today)
      ? { glyph: kindGlyph.holiday, tint: color.holiday, title: 'Weekend', sub: 'A holiday; clock in or work from home if you are working' }
      : { glyph: '○', tint: color.muted, title: 'Not logged yet', sub: 'Clock in, work from home, take leave, or mark a holiday' }
    : day.kind === 'holiday'
      ? { glyph: kindGlyph.holiday, tint: color.holiday, title: day.note ?? 'Holiday', sub: 'Not a working day' }
      : day.kind === 'wfh'
        ? { glyph: kindGlyph.wfh, tint: color.wfh, title: 'Working from home', sub: 'Counts as a worked day' }
        : day.kind === 'leave'
          ? { glyph: kindGlyph.leave, tint: color.leave, title: leaveLabel(day.leaveType), sub: day.note ?? 'On leave today' }
          : {
              glyph: kindGlyph.office,
              tint: color.office,
              title: open ? 'Clocked in' : day.out ? 'Clocked out' : 'In office',
              sub: open ? 'Timer is running' : day.out ? 'Day complete' : 'Not clocked in yet',
            }
  return (
    <Box flexDirection="column">
      <Text color={color.muted} bold>
        {formatLong(today)}
      </Text>
      <Card tint={status.tint} marginTop={1}>
        <Box justifyContent="space-between" gap={2}>
          <Text color={status.tint} bold>
            {status.glyph} {status.title}
          </Text>
          {minutes != null ? (
            <Text color={color.text} bold>
              {formatMinutes(minutes)}
            </Text>
          ) : null}
        </Box>
        <Text color={color.muted}>{status.sub}</Text>
        {workedHoliday(today, day) ? (
          <Text color={color.holiday}>
            {kindGlyph.holiday} Working on a holiday{day?.holiday && day.note ? `: ${day.note}` : ''}
          </Text>
        ) : null}
        {office?.in ? (
          <Box gap={3} marginTop={1}>
            <Text>
              <Text color={color.faint}>IN </Text>
              <Text color={color.text} bold>
                {office.in}
              </Text>
            </Text>
            {office.out ? (
              <Text>
                <Text color={color.faint}>OUT </Text>
                <Text color={color.text} bold>
                  {office.out}
                </Text>
              </Text>
            ) : null}
          </Box>
        ) : null}
      </Card>
    </Box>
  )
}

const dow = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// One day: what fills it, how its number is drawn, and whether it is a holiday that was worked.
function dayLook(date: string, days: Days, today: string, planned: boolean) {
  const day = days[date] ?? null
  const kind = tone(day)
  const weekend = isWeekend(date)
  if (planned) return { fill: mix(color.leave, color.panel, 0.3), ink: color.leave, worked: false }
  if (kind !== 'none') return { fill: toneColor[kind], ink: kind === 'office-open' ? color.text : color.ink, worked: workedHoliday(date, day) }
  // Today is only tinted; the cursor is what gets a border.
  if (date === today) return { fill: mix(color.accent, color.panel, 0.18), ink: color.accent, worked: false }
  // A past working day with nothing logged stands out; empty weekends (holidays) and the future stay quiet.
  if (date < today && !weekend) return { fill: toneColor.none, ink: color.muted, worked: false }
  return { fill: undefined, ink: weekend ? color.faint : color.muted, worked: false }
}

type Run = { text: string; fg?: string; bg?: string; bold?: boolean }

const blank = (width: number): Run => ({ text: ' '.repeat(width) })

// `text` in the middle of `width` columns; an odd leftover goes to the right.
function centred(text: string, width: number): string {
  const left = Math.floor((width - text.length) / 2)
  return ' '.repeat(left) + text + ' '.repeat(width - text.length - left)
}

// Terminal cells are a bit over twice as tall as they are wide, so a tile `size` columns wide and 3 rows tall is close
// to square at the default 7. Tiles shrink to fit `width`.
function tileSize(width: number): number {
  return Math.max(5, Math.min(7, Math.floor((width + 1) / 7) - 1))
}

// Monday-first heatmap of square tiles with the day number in the middle. The cursor's tile draws its own rounded
// border, so the highlight is the same square and moving it never shifts the grid. A worked holiday carries the holiday
// glyph under its number (in the cursor's bottom border when selected). `planned` tints a range of leave being picked.
// `width` is the room available; the grid takes as much of it as the tiles allow. `spaced` puts a blank row between
// weeks; a short terminal turns it off so the panel still fits.
export function MonthGrid({
  days,
  year,
  month,
  today,
  selected,
  planned = [],
  width = 57,
  spaced = true,
}: {
  days: Days
  year: number
  month: number
  today: string
  selected?: string
  planned?: string[]
  width?: number
  spaced?: boolean
}) {
  const size = tileSize(width)
  const cells = monthCells(year, month)
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7))

  // Row 0 to 2 of every tile in a week, with a one-column gap between tiles.
  const tileRow = (week: (string | null)[], row: number): Run[] =>
    week.flatMap((date, column): Run[] => {
      const gap = column === 0 ? [] : [blank(1)]
      if (!date) return [...gap, blank(size)]
      const look = dayLook(date, days, today, planned.includes(date))
      const number = String(Number(date.slice(8)))
      const bold = date === today || date === selected
      if (date !== selected) {
        const text = row === 1 ? centred(number, size) : row === 2 && look.worked ? centred(kindGlyph.holiday, size) : ' '.repeat(size)
        return [...gap, { text, fg: look.ink, bg: look.fill, bold }]
      }
      const edge = (text: string): Run => ({ text, fg: color.accent, bg: look.fill })
      if (row === 0) return [...gap, edge(`╭${'─'.repeat(size - 2)}╮`)]
      if (row === 2) return [...gap, edge(`╰${look.worked ? centred(kindGlyph.holiday, size - 2).replace(/ /g, '─') : '─'.repeat(size - 2)}╯`)]
      return [...gap, edge('│'), { text: centred(number, size - 2), fg: look.ink, bg: look.fill, bold }, edge('│')]
    })

  const lines: Run[][] = [
    dow.map((name, index): Run => ({ text: (index ? ' ' : '') + centred(name, size), fg: index > 4 ? color.faint : color.muted, bold: true })),
    ...weeks.flatMap((week, row) => [...(row && spaced ? [[blank(1)]] : []), tileRow(week, 0), tileRow(week, 1), tileRow(week, 2)]),
  ]
  return (
    <Box flexDirection="column">
      {lines.map((runs, line) => (
        <Text key={line}>
          {runs.map((run, index) => (
            <Text key={index} color={run.fg} backgroundColor={run.bg} bold={run.bold}>
              {run.text}
            </Text>
          ))}
        </Text>
      ))}
    </Box>
  )
}

export function Legend() {
  const items = [
    ['Office', toneColor.office],
    ['Home', toneColor.wfh],
    ['Leave', toneColor.leave],
    ['Holiday', toneColor.holiday],
    ['Open', toneColor['office-open']],
  ] as const
  return (
    <Box gap={2}>
      {items.map(([label, swatch]) => (
        <Text key={label} color={color.muted}>
          <Text color={swatch}>■</Text> {label}
        </Text>
      ))}
    </Box>
  )
}

// Holidays include the month's empty weekends; working holidays are added when there are any.
export function MonthSummary({ days, year, month, today }: { days: Days; year: number; month: number; today: string }) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const summary = summarize(days, { today, prefix })
  return (
    <Text color={color.muted}>
      <Text color={color.office}>{summary.office}</Text> office · <Text color={color.wfh}>{summary.wfh}</Text> home ·{' '}
      <Text color={color.leave}>{summary.leave}</Text> leave · <Text color={color.holiday}>{summary.holiday}</Text>{' '}
      {summary.holiday === 1 ? 'holiday' : 'holidays'}
      {summary.workedHolidays ? `, ${summary.workedHolidays} worked` : ''} · {formatMinutes(summary.minutes)}
    </Text>
  )
}

export function MonthView({ days, year, month, today }: { days: Days; year: number; month: number; today: string }) {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={color.accent}>
        {formatMonth(year, month)}
      </Text>
      <MonthGrid days={days} year={year} month={month} today={today} />
      <Legend />
      <MonthSummary days={days} year={year} month={month} today={today} />
    </Box>
  )
}

const monthNames = Array.from({ length: 12 }, (_, index) => new Date(2000, index, 1).toLocaleDateString(undefined, { month: 'short' }))

export function YearView({ days, year, today }: { days: Days; year: number; today: string }) {
  const summary = summarize(days, { today, prefix: String(year) })
  const counts = leaveCounts(days, String(year))
  const months = monthNames
    .map((name, index) => {
      const key = `${year}-${String(index + 1).padStart(2, '0')}`
      return { name, key, ...summarize(days, { today, prefix: key }) }
    })
    .filter((item) => item.office + item.wfh + item.leave > 0)
  const leaveLine = [
    ...leaveTypes.filter((item) => counts[item.id] > 0).map((item) => `${item.label} ${counts[item.id]}`),
    ...(counts.unmarked > 0 ? [`Untyped ${counts.unmarked}`] : []),
  ].join(' · ')
  const totals = [
    ['Office', summary.office, color.office],
    ['Home', summary.wfh, color.wfh],
    ['Leave', summary.leave, color.leave],
    ['Holiday', summary.holiday, color.holiday],
    ['Hours', Math.round(summary.minutes / 60), color.text],
  ] as const
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={color.accent}>
        {year}
      </Text>
      <Box gap={1}>
        {totals.map(([label, value, tint]) => (
          <Card key={label} width={10} alignItems="center" paddingX={0}>
            <Text color={tint} bold>
              {value}
            </Text>
            <Text color={color.muted}>{label}</Text>
          </Card>
        ))}
      </Box>
      <Text color={color.faint}>
        Weekdays logged {summary.weekdaysMarked} of {summary.weekdays}
        {summary.workedHolidays ? <Text color={color.holiday}> · worked on {plural(summary.workedHolidays, 'holiday')}</Text> : null}
        {leaveLine ? <Text color={color.muted}> · {leaveLine}</Text> : null}
      </Text>
      {months.length === 0 ? (
        <Text color={color.muted}>Nothing logged in {year}.</Text>
      ) : (
        <Box flexDirection="column">
          <Row cells={['Month', 'Office', 'Home', 'Leave', 'Holiday', 'Hours']} head />
          {months.map((item) => (
            <Row
              key={item.key}
              cells={[
                item.name,
                String(item.office),
                String(item.wfh),
                String(item.leave),
                String(item.holiday),
                item.minutes ? formatMinutes(item.minutes) : '—',
              ]}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}

const widths = [8, 8, 8, 8, 9, 10]

function Row({ cells, head = false }: { cells: string[]; head?: boolean }) {
  return (
    <Box>
      {cells.map((cell, index) => (
        <Box key={index} width={widths[index]} justifyContent={index === 0 ? 'flex-start' : 'flex-end'}>
          <Text color={head ? color.faint : index === 0 ? color.muted : color.text} bold={head}>
            {cell}
          </Text>
        </Box>
      ))}
    </Box>
  )
}
