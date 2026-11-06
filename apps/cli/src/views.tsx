import {
  formatLong,
  formatMinutes,
  formatMonth,
  leaveCounts,
  leaveLabel,
  leaveTypes,
  minutesBetween,
  minutesSince,
  monthCells,
  summarize,
  tone,
  type Day,
  type Days,
} from '@logbook/core'
import { Box, Text } from 'ink'
import { color, kindMeta, toneColor } from './theme.ts'

// Shared by the interactive view and the one-shot commands, so both look the same.

export function Status({ day, now, today }: { day?: Day; now: Date; today: string }) {
  const office = day?.kind === 'office' ? day : null
  const open = Boolean(office?.in) && !office?.out
  const minutes = open && office?.in ? minutesSince(office.in, now) : office ? minutesBetween(office.in, office.out) : null
  const status = !day
    ? { glyph: '○', tint: color.muted, title: 'Not logged yet', sub: 'Clock in, work from home, or take leave' }
    : day.kind === 'wfh'
      ? { ...kindMeta.wfh, title: 'Working from home', sub: 'Counts as a worked day' }
      : day.kind === 'leave'
        ? { ...kindMeta.leave, title: leaveLabel(day.leaveType), sub: day.note ?? 'On leave today' }
        : {
            ...kindMeta.office,
            title: open ? 'Clocked in' : day.out ? 'Clocked out' : 'In office',
            sub: open ? 'Timer is running' : day.out ? 'Day complete' : 'Not clocked in yet',
          }
  return (
    <Box flexDirection="column">
      <Text color={color.faint}>{formatLong(today)}</Text>
      <Box gap={2} marginTop={1}>
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
      {office?.in ? (
        <Box gap={3} marginTop={1}>
          <Text>
            <Text color={color.faint}>IN </Text>
            <Text color={color.text}>{office.in}</Text>
          </Text>
          {office.out ? (
            <Text>
              <Text color={color.faint}>OUT </Text>
              <Text color={color.text}>{office.out}</Text>
            </Text>
          ) : null}
        </Box>
      ) : null}
    </Box>
  )
}

const dow = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// Monday-first heatmap; each day is a coloured block like the phone's calendar. `planned` marks a range of leave being picked.
export function MonthGrid({
  days,
  year,
  month,
  today,
  selected,
  planned = [],
}: {
  days: Days
  year: number
  month: number
  today: string
  selected?: string
  planned?: string[]
}) {
  const cells = monthCells(year, month)
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7))
  return (
    <Box flexDirection="column">
      <Box>
        {dow.map((name, index) => (
          <Box key={name} width={5} justifyContent="center">
            <Text color={index > 4 ? color.faint : color.muted} bold>
              {name}
            </Text>
          </Box>
        ))}
      </Box>
      {weeks.map((week, row) => (
        <Box key={row}>
          {week.map((date, index) => {
            if (!date) return <Box key={index} width={5} />
            const kind = tone(days[date] ?? null)
            const future = date > today && kind === 'none'
            const filled = !future
            const ink = kind === 'office' || kind === 'wfh' ? color.ink : future ? color.faint : color.text
            const marker = date === selected ? '›' : planned.includes(date) ? '•' : ' '
            const label = String(Number(date.slice(8))).padStart(2, ' ')
            return (
              <Box key={date} width={5}>
                <Text color={date === selected ? color.office : color.leave}>{marker}</Text>
                <Text
                  backgroundColor={filled ? toneColor[kind] : undefined}
                  color={date === today ? color.office : ink}
                  bold={date === today || date === selected}
                  underline={date === today}
                >
                  {` ${label} `}
                </Text>
              </Box>
            )
          })}
        </Box>
      ))}
    </Box>
  )
}

export function Legend() {
  const items = [
    ['Office', toneColor.office],
    ['Home', toneColor.wfh],
    ['Leave', toneColor.leave],
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

export function MonthSummary({ days, year, month, today }: { days: Days; year: number; month: number; today: string }) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const summary = summarize(days, { today, prefix })
  return (
    <Text color={color.muted}>
      <Text color={color.office}>{summary.office}</Text> office · <Text color={color.wfh}>{summary.wfh}</Text> home ·{' '}
      <Text color={color.leave}>{summary.leave}</Text> leave · {formatMinutes(summary.minutes)}
    </Text>
  )
}

export function MonthView({ days, year, month, today }: { days: Days; year: number; month: number; today: string }) {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={color.text}>
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
    ['Hours', Math.round(summary.minutes / 60), color.text],
  ] as const
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={color.text}>
        {year}
      </Text>
      <Box gap={4}>
        {totals.map(([label, value, tint]) => (
          <Box key={label} flexDirection="column" alignItems="center">
            <Text color={tint} bold>
              {value}
            </Text>
            <Text color={color.muted}>{label}</Text>
          </Box>
        ))}
      </Box>
      <Text color={color.faint}>
        Weekdays logged {summary.weekdaysMarked} of {summary.weekdays}
        {leaveLine ? <Text color={color.muted}> · {leaveLine}</Text> : null}
      </Text>
      {months.length === 0 ? (
        <Text color={color.muted}>Nothing logged in {year}.</Text>
      ) : (
        <Box flexDirection="column">
          <Row cells={['Month', 'Office', 'Home', 'Leave', 'Hours']} head />
          {months.map((item) => (
            <Row
              key={item.key}
              cells={[item.name, String(item.office), String(item.wfh), String(item.leave), item.minutes ? formatMinutes(item.minutes) : '—']}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}

const widths = [8, 8, 8, 8, 10]

function Row({ cells, head = false }: { cells: string[]; head?: boolean }) {
  return (
    <Box>
      {cells.map((cell, index) => (
        <Box key={index} width={widths[index]} justifyContent={index === 0 ? 'flex-start' : 'flex-end'}>
          <Text color={head ? color.faint : color.text} bold={head}>
            {cell}
          </Text>
        </Box>
      ))}
    </Box>
  )
}
