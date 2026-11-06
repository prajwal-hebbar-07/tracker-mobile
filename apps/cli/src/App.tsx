import {
  addDays,
  cleanDays,
  describeDay,
  excelMonthSheet,
  excelSheets,
  formatLong,
  formatRange,
  formatShort,
  leaveDates,
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
import { Box, Text, useApp, useInput, useWindowSize, type Key } from 'ink'
import TextInput from 'ink-text-input'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { useEffect, useRef, useState } from 'react'
import { clockIn, clockOut, overwrites, reset, takeLeave, takeLeaveRange, workFromHome, type Change, type RangeChange } from './actions.ts'
import { readLog, replaceLog, setDays as saveDays } from './store.ts'
import { writeSettings, type Settings } from './settings.ts'
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
  vim: boolean
  apply: (date: string, change: Change) => void
  applyRange: (change: RangeChange) => void
  ask: (prompt: Prompt) => void
  say: (flash: Flash) => void
}

type Move = 'left' | 'right' | 'up' | 'down'

// Arrows always move; with vim keys on, h j k l move too.
function moveOf(input: string, key: Key, vim: boolean): Move | null {
  if (key.leftArrow || (vim && input === 'h')) return 'left'
  if (key.rightArrow || (vim && input === 'l')) return 'right'
  if (key.upArrow || (vim && input === 'k')) return 'up'
  if (key.downArrow || (vim && input === 'j')) return 'down'
  return null
}

// Full-screen view: Tab, Shift+Tab or 1-4 switch pages (and H L with vim keys), each page lists its keys at the bottom.
export function App({
  file,
  settingsFile,
  settings,
  version,
  update,
}: {
  file: string
  settingsFile: string
  settings: Settings
  version: string
  update: string | null
}) {
  const { exit } = useApp()
  const { columns, rows } = useWindowSize()
  const [days, setDays] = useState<Days>({})
  const [loadError, setLoadError] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [page, setPage] = useState(0)
  const [flash, setFlash] = useState<Flash>(null)
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const seen = useRef('')
  const [vim, setVim] = useState(settings.vim)
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

  function write(changes: Record<string, Day | null>, message: string) {
    saveDays(file, changes).then(
      (next) => {
        seen.current = JSON.stringify(next)
        setDays(next)
        setFlash({ ok: true, text: message })
      },
      (error: Error) => setFlash({ ok: false, text: error.message }),
    )
  }

  function apply(date: string, change: Change) {
    if (!change.ok) return setFlash({ ok: false, text: change.message })
    write({ [date]: change.day }, change.message)
  }

  function applyRange(change: RangeChange) {
    if (!change.ok) return setFlash({ ok: false, text: change.message })
    write(change.days, change.message)
  }

  // Saved right away, so the next `logbook` starts in the same mode.
  function toggleVim() {
    const next = !vim
    setVim(next)
    writeSettings(settingsFile, { vim: next }).then(
      () => setFlash({ ok: true, text: next ? 'Vim keys on: h j k l move, H L switch pages, esc no longer quits.' : 'Vim keys off.' }),
      (error: Error) => setFlash({ ok: false, text: error.message }),
    )
  }

  const props = { days, now, today, vim, apply, applyRange, ask: setPrompt, say: setFlash }

  function goTo(index: number) {
    setPage((index + pages.length) % pages.length)
    setFlash(null)
  }

  useInput(
    (input, key) => {
      // Vim users press esc out of habit, so with vim keys only q quits.
      if (input === 'q' || (key.escape && !vim)) return exit()
      const index = Number(input) - 1
      if (index >= 0 && index < pages.length) return goTo(index)
      if (key.tab) return goTo(page + (key.shift ? -1 : 1))
      if (vim && input === 'H') return goTo(page - 1)
      if (vim && input === 'L') return goTo(page + 1)
    },
    { isActive: !prompt },
  )

  const width = Math.min(columns, 64)

  // The panel sits in the middle of the terminal; the outer box fills the whole alternate screen.
  return (
    <Box width={columns} height={rows} alignItems="center" justifyContent="center">
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
          {page === 3 ? (
            <MorePage {...props} active={!prompt} file={file} version={version} update={update} toggleVim={toggleVim} />
          ) : null}
        </Box>
        {prompt ? <PromptView prompt={prompt} vim={vim} close={() => setPrompt(null)} /> : null}
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
          <Text color={color.faint}>{vim ? 'H L · tab · 1-4 pages' : 'tab · shift+tab · 1-4 pages'}</Text>
          <Text color={color.faint}>q quit</Text>
        </Box>
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

// With vim keys on, h and l only ever move, so the actions that use them take other letters.
function actionKeys(vim: boolean) {
  return { home: vim ? 'w' : 'h', leave: vim ? 'm' : 'l', range: vim ? 'v' : 'r' }
}

function TodayPage({ days, now, today, active, vim, apply, ask }: PageProps) {
  const day = days[today]
  const office = day?.kind === 'office' ? day : null
  const keyOf = actionKeys(vim)
  useInput(
    (input) => {
      const at = timeNow(now)
      if (input === 'i') apply(today, clockIn(day, undefined, at))
      if (input === 'o') apply(today, clockOut(day, undefined, at))
      if (input === keyOf.home) apply(today, workFromHome(day))
      if (input === keyOf.leave && !day) askLeave(ask, apply, today, day, false)
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
        [keyOf.home, 'from home'],
        [keyOf.leave, 'leave'],
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

// Asks for the type and an optional note, confirms replacing logged days, then saves every date at once.
function askLeaveRange(
  { days, ask, applyRange }: Pick<PageProps, 'days' | 'ask' | 'applyRange'>,
  range: { from: string; to: string },
  dates: string[],
  done: () => void,
) {
  ask({
    kind: 'choice',
    label: `Leave on ${formatRange(range.from, range.to)}, ${plural(dates.length, 'day')}`,
    options: leaveTypes.map((item) => item.label),
    onPick: (index) => {
      const leaveType: LeaveType = leaveTypes[index].id
      ask({
        kind: 'text',
        label: 'Note (optional), Enter to save',
        onSubmit: (note) => {
          const save = () => {
            applyRange(takeLeaveRange(days, dates, leaveType, note, true))
            done()
          }
          const taken = overwrites(days, dates)
          if (taken.length === 0) return save()
          ask({ kind: 'confirm', label: `Replace ${plural(taken.length, 'logged day')} with leave? ${taken.map(formatShort).join(', ')}`, onYes: save })
        },
      })
    },
  })
}

function MonthPage({ days, today, active, vim, apply, applyRange, ask, say, goToday }: PageProps & { goToday: () => void }) {
  const keyOf = actionKeys(vim)
  const arrows = vim ? 'hjkl' : '←↑↓→'
  const [selected, setSelected] = useState(today)
  // Where a range of leave starts; the cursor is the other end, as on the phone's Plan leave sheet.
  const [anchor, setAnchor] = useState<string | null>(null)
  const [weekends, setWeekends] = useState(false)
  const year = Number(selected.slice(0, 4))
  const month = Number(selected.slice(5, 7)) - 1
  const day = days[selected]
  const range = anchor ? (anchor <= selected ? { from: anchor, to: selected } : { from: selected, to: anchor }) : null
  const planned = range ? leaveDates(range.from, range.to, weekends) : []
  const shiftMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1)
    setSelected(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`)
  }
  useInput(
    (input, key) => {
      const move = moveOf(input, key, vim)
      if (move) return setSelected(addDays(selected, { left: -1, right: 1, up: -7, down: 7 }[move]))
      if (input === '[') shiftMonth(-1)
      if (input === ']') shiftMonth(1)
      if (input === 't') setSelected(today)
      if (input === keyOf.range) return setAnchor(anchor ? null : selected)
      if (range) {
        if (vim && key.escape) return setAnchor(null)
        if (input === 'w') setWeekends(!weekends)
        if (input === keyOf.leave) {
          if (planned.length === 0) return say({ ok: false, text: 'No working days in that range. Press w to count weekends.' })
          askLeaveRange({ days, ask, applyRange }, range, planned, () => setAnchor(null))
        }
        return
      }
      if (key.return && selected === today) goToday()
      if (selected === today) return
      if (input === keyOf.leave) {
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
  const keys: [string, string][] = range
    ? [
        [arrows, 'extend'],
        ['[ ]', 'month'],
        [keyOf.leave, `leave on ${plural(planned.length, 'day')}`],
        ['w', weekends ? 'skip weekends' : 'count weekends'],
        [vim ? 'v/esc' : 'r', 'cancel range'],
      ]
    : selected === today
      ? [
          [arrows, 'day'],
          ['[ ]', 'month'],
          ['enter', 'open Today'],
          [keyOf.range, 'range'],
        ]
      : [
          [arrows, 'day'],
          ['[ ]', 'month'],
          ['t', 'today'],
          [keyOf.leave, day?.kind === 'leave' ? 'edit leave' : 'mark leave'],
          ...(day?.kind === 'leave' ? ([['d', 'remove']] as [string, string][]) : []),
          [keyOf.range, 'range'],
        ]
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={color.text}>
        {new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
      </Text>
      <MonthGrid days={days} year={year} month={month} today={today} selected={selected} planned={planned} />
      <Legend />
      {range ? (
        <Box flexDirection="column">
          <Text color={color.leave} bold>
            {formatRange(range.from, range.to)}
          </Text>
          <Text color={color.muted}>
            {plural(planned.length, 'day')} of leave · weekends {weekends ? 'counted' : 'skipped'}
          </Text>
        </Box>
      ) : (
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
      )}
      <Keys items={keys} />
    </Box>
  )
}

function YearPage({ days, today, active, vim }: PageProps) {
  const thisYear = Number(today.slice(0, 4))
  const [year, setYear] = useState(thisYear)
  useInput(
    (input, key) => {
      const move = moveOf(input, key, vim)
      if (move === 'left') setYear(year - 1)
      if (move === 'right') setYear(year + 1)
      if (input === 't') setYear(thisYear)
    },
    { isActive: active },
  )
  return (
    <Box flexDirection="column">
      <YearView days={days} year={year} today={today} />
      <Keys
        items={[
          [vim ? 'h l' : '← →', 'year'],
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
  vim,
  ask,
  say,
  file,
  version,
  update,
  toggleVim,
}: PageProps & { file: string; version: string; update: string | null; toggleVim: () => void }) {
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
      // The widget shares this log, so erasing here empties it too; typing the word keeps a stray Enter from doing it.
      label: 'Erase all data',
      run: () => {
        const count = Object.keys(days).length
        if (count === 0) return say({ ok: true, text: 'The log is already empty.' })
        ask({
          kind: 'text',
          label: `Type erase to delete all ${plural(count, 'day')}, here and in the widget. Save a backup first to keep them.`,
          onSubmit: (value) => {
            if (value.trim().toLowerCase() !== 'erase') return say({ ok: false, text: 'Nothing was erased.' })
            replaceLog(file, {}).then(
              () => say({ ok: true, text: `Erased ${plural(count, 'day')}.` }),
              (error: Error) => say({ ok: false, text: error.message }),
            )
          },
        })
      },
    },
    { label: `Vim keys: ${vim ? 'on' : 'off'}`, run: toggleVim },
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
    (input, key) => {
      const move = moveOf(input, key, vim)
      if (move === 'up') setCursor((cursor + actions.length - 1) % actions.length)
      if (move === 'down') setCursor((cursor + 1) % actions.length)
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
          [vim ? 'j k' : '↑↓', 'choose'],
          ['enter', 'run'],
        ]}
      />
    </Box>
  )
}

function PromptView({ prompt, vim, close }: { prompt: Prompt; vim: boolean; close: () => void }) {
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
      const move = moveOf(input, key, vim)
      if (move === 'up') setCursor((cursor + prompt.options.length - 1) % prompt.options.length)
      if (move === 'down') setCursor((cursor + 1) % prompt.options.length)
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
