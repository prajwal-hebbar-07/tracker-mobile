import {
  addDays,
  cleanDays,
  describeDay,
  excelMonthSheet,
  excelSheets,
  formatLong,
  leaveTypes,
  maxExcelYears,
  plural,
  timeNow,
  todayKey,
  toXlsx,
  type Day,
  type Days,
  type LeaveType,
} from '@logbook/core'
import { Box, Text, useApp, useInput, useWindowSize } from 'ink'
import TextInput from 'ink-text-input'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { useEffect, useRef, useState } from 'react'
import { clockIn, clockOut, reset, takeLeave, workFromHome, type Change } from './actions.ts'
import { readLog, replaceLog, setDay } from './store.ts'
import { color } from './theme.ts'
import { selfUpdate } from './update.ts'
import { Legend, MonthGrid, MonthSummary, Status, YearView } from './views.tsx'

const pages = ['Today', 'Month', 'Year', 'More'] as const

type Flash = { ok: boolean; text: string } | null
type Prompt =
  | { kind: 'text'; label: string; initial?: string; onSubmit: (value: string) => void }
  | { kind: 'choice'; label: string; options: string[]; onPick: (index: number) => void }
  | { kind: 'confirm'; label: string; onYes: () => void }

type PageProps = {
  days: Days
  now: Date
  today: string
  active: boolean
  apply: (date: string, change: Change) => void
  ask: (prompt: Prompt) => void
  say: (flash: Flash) => void
}

// Full-screen view: Tab or 1-4 switch pages, each page lists its keys at the bottom.
export function App({ file, version, update }: { file: string; version: string; update: string | null }) {
  const { exit } = useApp()
  const { columns } = useWindowSize()
  const [days, setDays] = useState<Days>({})
  const [loadError, setLoadError] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [page, setPage] = useState(0)
  const [flash, setFlash] = useState<Flash>(null)
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const seen = useRef('')
  const today = todayKey(now)

  // Re-reads the shared file every 2 s, so changes made in the Mac widget show up here.
  useEffect(() => {
    const sync = () =>
      readLog(file).then(
        (next) => {
          const text = JSON.stringify(next)
          if (text !== seen.current) {
            seen.current = text
            setDays(next)
          }
          setLoadError('')
        },
        (error: Error) => setLoadError(error.message),
      )
    void sync()
    const poll = setInterval(sync, 2000)
    const clock = setInterval(() => setNow(new Date()), 15000)
    return () => {
      clearInterval(poll)
      clearInterval(clock)
    }
  }, [file])

  function apply(date: string, change: Change) {
    if (!change.ok) return setFlash({ ok: false, text: change.message })
    setDay(file, date, change.day).then(
      (next) => {
        seen.current = JSON.stringify(next)
        setDays(next)
        setFlash({ ok: true, text: change.message })
      },
      (error: Error) => setFlash({ ok: false, text: error.message }),
    )
  }

  const props = { days, now, today, apply, ask: setPrompt, say: setFlash }

  function goTo(index: number) {
    setPage(index)
    setFlash(null)
  }

  useInput(
    (input, key) => {
      if (input === 'q' || key.escape) return exit()
      const index = Number(input) - 1
      if (index >= 0 && index < pages.length) return goTo(index)
      if (key.tab) goTo((page + (key.shift ? pages.length - 1 : 1)) % pages.length)
    },
    { isActive: !prompt },
  )

  const width = Math.min(columns, 64)

  return (
    <Box flexDirection="column" width={width} borderStyle="round" borderColor={color.line} paddingX={2} paddingY={1}>
      <Box justifyContent="space-between">
        <Text color={color.office} bold>
          ◆ Logbook
        </Text>
        <Box gap={2}>
          {pages.map((name, index) => (
            <Text key={name} color={index === page ? color.office : color.faint} bold={index === page} underline={index === page}>
              {name}
            </Text>
          ))}
        </Box>
      </Box>
      <Box marginTop={1} minHeight={14} flexDirection="column">
        {loadError ? <Text color={color.danger}>{loadError}</Text> : null}
        {page === 0 ? <TodayPage {...props} active={!prompt} /> : null}
        {page === 1 ? <MonthPage {...props} active={!prompt} goToday={() => goTo(0)} /> : null}
        {page === 2 ? <YearPage {...props} active={!prompt} /> : null}
        {page === 3 ? <MorePage {...props} active={!prompt} file={file} version={version} update={update} /> : null}
      </Box>
      {prompt ? <PromptView prompt={prompt} close={() => setPrompt(null)} /> : null}
      {flash ? (
        <Text color={flash.ok ? color.success : color.danger}>
          {flash.ok ? '✓' : '✗'} {flash.text}
        </Text>
      ) : null}
      {update ? (
        <Text color={color.office}>
          ↑ Logbook {update} is available ({version} installed). Run <Text bold>logbook update</Text>.
        </Text>
      ) : null}
      <Box marginTop={1} justifyContent="space-between">
        <Text color={color.faint}>tab/1-4 pages</Text>
        <Text color={color.faint}>q quit</Text>
      </Box>
    </Box>
  )
}

function Keys({ items }: { items: [string, string][] }) {
  return (
    <Box marginTop={1} flexWrap="wrap" columnGap={2}>
      {items.map(([key, label]) => (
        <Text key={key} color={color.muted}>
          <Text color={color.office} bold>
            {key}
          </Text>{' '}
          {label}
        </Text>
      ))}
    </Box>
  )
}

// Picks a leave type, then an optional note, then saves through `takeLeave`.
function askLeave(ask: PageProps['ask'], apply: PageProps['apply'], date: string, day: Day | undefined, replace: boolean) {
  ask({
    kind: 'choice',
    label: `Leave on ${formatLong(date)}`,
    options: leaveTypes.map((item) => item.label),
    onPick: (index) => {
      const leaveType: LeaveType = leaveTypes[index].id
      ask({
        kind: 'text',
        label: 'Note (optional), Enter to save',
        initial: day?.kind === 'leave' ? (day.note ?? '') : '',
        onSubmit: (note) => apply(date, takeLeave(day, leaveType, note, replace)),
      })
    },
  })
}

function TodayPage({ days, now, today, active, apply, ask }: PageProps) {
  const day = days[today]
  const office = day?.kind === 'office' ? day : null
  useInput(
    (input) => {
      const at = timeNow(now)
      if (input === 'i') apply(today, clockIn(day, undefined, at))
      if (input === 'o') apply(today, clockOut(day, undefined, at))
      if (input === 'h') apply(today, workFromHome(day))
      if (input === 'l' && !day) askLeave(ask, apply, today, day, false)
      if (input === 's' && day) ask({ kind: 'confirm', label: 'Start today over?', onYes: () => apply(today, reset(day, true)) })
      if (input === 'e' && office?.in) {
        ask({ kind: 'text', label: 'Clock-in time (HH:MM)', initial: office.in, onSubmit: (value) => apply(today, clockIn(day, value, timeNow())) })
      }
      if (input === 'u' && office?.out) {
        ask({ kind: 'text', label: 'Clock-out time (HH:MM)', initial: office.out, onSubmit: (value) => apply(today, clockOut(day, value, timeNow())) })
      }
    },
    { isActive: active },
  )
  const keys: [string, string][] = !day
    ? [
        ['i', 'clock in'],
        ['h', 'from home'],
        ['l', 'leave'],
      ]
    : office?.in && !office.out
      ? [
          ['o', 'clock out'],
          ['e', 'edit in'],
          ['s', 'start over'],
        ]
      : office?.out
        ? [
            ['e', 'edit in'],
            ['u', 'edit out'],
            ['s', 'start over'],
          ]
        : office
          ? [
              ['i', 'clock in'],
              ['s', 'start over'],
            ]
          : [['s', 'start over']]
  return (
    <Box flexDirection="column">
      <Status day={day} now={now} today={today} />
      <Keys items={keys} />
    </Box>
  )
}

function MonthPage({ days, today, active, apply, ask, goToday }: PageProps & { goToday: () => void }) {
  const [selected, setSelected] = useState(today)
  const year = Number(selected.slice(0, 4))
  const month = Number(selected.slice(5, 7)) - 1
  const day = days[selected]
  const shiftMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1)
    setSelected(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`)
  }
  useInput(
    (input, key) => {
      if (key.leftArrow) setSelected(addDays(selected, -1))
      if (key.rightArrow) setSelected(addDays(selected, 1))
      if (key.upArrow) setSelected(addDays(selected, -7))
      if (key.downArrow) setSelected(addDays(selected, 7))
      if (input === '[') shiftMonth(-1)
      if (input === ']') shiftMonth(1)
      if (input === 't') setSelected(today)
      if (key.return && selected === today) goToday()
      if (selected === today) return
      if (input === 'l') {
        if (day && day.kind !== 'leave') {
          ask({ kind: 'confirm', label: `Replace ${describeDay(day)} with leave?`, onYes: () => askLeave(ask, apply, selected, day, true) })
        } else {
          askLeave(ask, apply, selected, day, false)
        }
      }
      if (input === 'd' && day?.kind === 'leave') {
        ask({ kind: 'confirm', label: 'Remove this leave?', onYes: () => apply(selected, reset(day, false)) })
      }
    },
    { isActive: active },
  )
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={color.text}>
        {new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
      </Text>
      <MonthGrid days={days} year={year} month={month} today={today} selected={selected} />
      <Legend />
      <Box flexDirection="column">
        <Text color={color.text} bold>
          {formatLong(selected)}
        </Text>
        <Text color={color.muted}>
          {day ? describeDay(day) : 'Nothing logged'}
          {day?.kind === 'leave' && day.note ? ` — ${day.note}` : ''}
        </Text>
        <MonthSummary days={days} year={year} month={month} today={today} />
      </Box>
      <Keys
        items={
          selected === today
            ? [
                ['←↑↓→', 'day'],
                ['[ ]', 'month'],
                ['enter', 'open Today'],
              ]
            : [
                ['←↑↓→', 'day'],
                ['[ ]', 'month'],
                ['t', 'today'],
                ['l', day?.kind === 'leave' ? 'edit leave' : 'mark leave'],
                ...(day?.kind === 'leave' ? ([['d', 'remove']] as [string, string][]) : []),
              ]
        }
      />
    </Box>
  )
}

function YearPage({ days, today, active }: PageProps) {
  const thisYear = Number(today.slice(0, 4))
  const [year, setYear] = useState(thisYear)
  useInput(
    (input, key) => {
      if (key.leftArrow) setYear(year - 1)
      if (key.rightArrow) setYear(year + 1)
      if (input === 't') setYear(thisYear)
    },
    { isActive: active },
  )
  return (
    <Box flexDirection="column">
      <YearView days={days} year={year} today={today} />
      <Keys
        items={[
          ['← →', 'year'],
          ['t', 'this year'],
        ]}
      />
    </Box>
  )
}

// Exports land in ~/Downloads when it exists, otherwise in the current folder.
function outputPath(name: string): string {
  const downloads = join(homedir(), 'Downloads')
  return join(existsSync(downloads) ? downloads : process.cwd(), name)
}

function MorePage({
  days,
  today,
  active,
  ask,
  say,
  file,
  version,
  update,
}: PageProps & { file: string; version: string; update: string | null }) {
  const [cursor, setCursor] = useState(0)
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7)) - 1
  const firstYear = Number((Object.keys(days).sort()[0] ?? today).slice(0, 4))
  const from = Math.max(firstYear, year - maxExcelYears + 1)

  async function save(name: string, bytes: Uint8Array | string, what: string) {
    const path = outputPath(name)
    try {
      await writeFile(path, bytes)
      say({ ok: true, text: `Saved ${what} to ${path}` })
    } catch (error) {
      say({ ok: false, text: (error as Error).message })
    }
  }

  const actions: { label: string; run: () => void }[] = [
    {
      label: `Excel: ${today.slice(0, 7)}`,
      run: () => void save(`logbook-${today.slice(0, 7)}.xlsx`, toXlsx([excelMonthSheet(days, year, month, today)]), 'the month'),
    },
    {
      label: `Excel: ${year}`,
      run: () =>
        void save(`logbook-${year}.xlsx`, toXlsx(excelSheets(days, { from: year, years: 1, weekends: true, split: true }, today)), 'the year'),
    },
    // Only offered once the log spans more than one year.
    ...(from < year
      ? [
          {
            label: `Excel: ${from}–${year}, a sheet per year`,
            run: () =>
              void save(
                `logbook-${from}-${year}.xlsx`,
                toXlsx(excelSheets(days, { from, years: year - from + 1, weekends: true, split: true }, today)),
                'every year',
              ),
          },
        ]
      : []),
    { label: 'Save backup (JSON)', run: () => void save(`logbook-backup-${today}.json`, JSON.stringify(days), 'the backup') },
    {
      label: 'Restore from a backup file',
      run: () =>
        ask({
          kind: 'text',
          label: 'Backup file path',
          onSubmit: (value) => {
            const path = resolve(value.trim().replace(/^~(?=\/)/, homedir()))
            readFile(path, 'utf8').then(
              (text) => {
                let cleaned: Days | null = null
                try {
                  cleaned = cleanDays(JSON.parse(text))
                } catch {
                  cleaned = null
                }
                const count = cleaned ? Object.keys(cleaned).length : 0
                if (!cleaned || count === 0) return say({ ok: false, text: 'Nothing in that file could be read. The log was left as it is.' })
                ask({
                  kind: 'confirm',
                  label: `Replace the log with ${plural(count, 'day')}?`,
                  onYes: () =>
                    replaceLog(file, cleaned).then(
                      () => say({ ok: true, text: `Restored ${plural(count, 'day')}.` }),
                      (error: Error) => say({ ok: false, text: error.message }),
                    ),
                })
              },
              (error: Error) => say({ ok: false, text: error.message }),
            )
          },
        }),
    },
    {
      label: update ? `Update to ${update}` : 'Check for updates',
      run: () => {
        say({ ok: true, text: 'Checking GitHub…' })
        selfUpdate(version).then(
          (text) => say({ ok: true, text: text.startsWith('Updated') ? `${text} Quit and run logbook again.` : text }),
          (error: Error) => say({ ok: false, text: error.message }),
        )
      },
    },
  ]

  useInput(
    (_input, key) => {
      if (key.upArrow) setCursor((cursor + actions.length - 1) % actions.length)
      if (key.downArrow) setCursor((cursor + 1) % actions.length)
      if (key.return) actions[cursor].run()
    },
    { isActive: active },
  )

  return (
    <Box flexDirection="column">
      {actions.map((action, index) => (
        <Text key={action.label} color={index === cursor ? color.office : color.text} bold={index === cursor}>
          {index === cursor ? '› ' : '  '}
          {action.label}
        </Text>
      ))}
      <Box marginTop={1} flexDirection="column">
        <Text color={color.faint}>Log: {file}</Text>
        <Text color={color.faint}>Logbook CLI {version}</Text>
      </Box>
      <Keys
        items={[
          ['↑↓', 'choose'],
          ['enter', 'run'],
        ]}
      />
    </Box>
  )
}

function PromptView({ prompt, close }: { prompt: Prompt; close: () => void }) {
  const [value, setValue] = useState(prompt.kind === 'text' ? (prompt.initial ?? '') : '')
  const [cursor, setCursor] = useState(0)
  useInput((input, key) => {
    if (key.escape) return close()
    if (prompt.kind === 'confirm') {
      if (input === 'y') {
        close()
        prompt.onYes()
      } else if (input === 'n') close()
    }
    if (prompt.kind === 'choice') {
      if (key.upArrow) setCursor((cursor + prompt.options.length - 1) % prompt.options.length)
      if (key.downArrow) setCursor((cursor + 1) % prompt.options.length)
      const picked = Number(input) - 1
      if (key.return || (picked >= 0 && picked < prompt.options.length)) {
        close()
        prompt.onPick(key.return ? cursor : picked)
      }
    }
  })
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={color.office} paddingX={1} marginTop={1}>
      <Text color={color.office} bold>
        {prompt.label}
      </Text>
      {prompt.kind === 'text' ? (
        <Box>
          <Text color={color.muted}>› </Text>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={(submitted) => {
              close()
              prompt.onSubmit(submitted)
            }}
          />
        </Box>
      ) : null}
      {prompt.kind === 'choice'
        ? prompt.options.map((option, index) => (
            <Text key={option} color={index === cursor ? color.leave : color.text}>
              {index === cursor ? '› ' : '  '}
              {index + 1}. {option}
            </Text>
          ))
        : null}
      <Text color={color.faint}>{prompt.kind === 'confirm' ? 'y yes · n no' : 'esc cancel'}</Text>
    </Box>
  )
}
