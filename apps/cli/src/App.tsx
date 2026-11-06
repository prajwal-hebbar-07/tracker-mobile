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
import { useContext, useEffect, useRef, useState } from 'react'
import { clockIn, clockOut, overwrites, reset, takeLeave, takeLeaveRange, workFromHome, type Change, type RangeChange } from './actions.ts'
import { readLog, replaceLog, setDays as saveDays } from './store.ts'
import { writeSettings, type Settings } from './settings.ts'
import { applyTheme, color, findTheme, themes } from './theme.ts'
import { selfUpdate } from './update.ts'
import { Backdrop, Legend, MonthGrid, MonthSummary, Status, YearView } from './views.tsx'

const pages = ['Today', 'Month', 'Year', 'More'] as const

type Flash = { ok: boolean; text: string } | null
type Prompt =
  | { kind: 'text'; label: string; initial?: string; onSubmit: (value: string) => void }
  | {
      kind: 'choice'
      label: string
      options: string[]
      initial?: number
      onPick: (index: number) => void
      // For previews: called as the cursor moves, and on esc.
      onMove?: (index: number) => void
      onCancel?: () => void
    }
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
  const [prefs, setPrefs] = useState(settings)
  // The theme on screen; differs from prefs.theme while the picker previews another one.
  const [painted, setPainted] = useState(settings.theme)
  const seen = useRef('')
  const asked = useRef(0)
  const vim = prefs.vim
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

  // Saved right away, so the next `logbook` starts the same way.
  function savePrefs(next: Settings, message: string) {
    setPrefs(next)
    writeSettings(settingsFile, next).then(
      () => setFlash({ ok: true, text: message }),
      (error: Error) => setFlash({ ok: false, text: error.message }),
    )
  }

  function toggleVim() {
    const next = !vim
    savePrefs({ ...prefs, vim: next }, next ? 'Vim keys on: h j k l move, H L switch pages, esc no longer quits.' : 'Vim keys off.')
  }

  function paint(id: string) {
    applyTheme(id)
    setPainted(id)
  }

  // Each theme shows as the cursor reaches it; Enter keeps it, esc goes back to the saved one.
  function chooseTheme() {
    ask({
      kind: 'choice',
      label: 'Theme',
      options: themes.map((theme) => theme.name),
      initial: Math.max(0, themes.findIndex((theme) => theme.id === prefs.theme)),
      onMove: (index) => paint(themes[index].id),
      onCancel: () => paint(prefs.theme),
      onPick: (index) => {
        paint(themes[index].id)
        savePrefs({ ...prefs, theme: themes[index].id }, `Theme: ${themes[index].name}.`)
      },
    })
  }

  // A fresh key per prompt, so one prompt opening the next never inherits its typed text or cursor.
  function ask(next: Prompt) {
    asked.current += 1
    setPrompt(next)
  }

  const props = { days, now, today, vim, apply, applyRange, ask, say: setFlash }

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
  const pageKeys: [string, string][] = vim
    ? [
        ['H L', 'pages'],
        ['1-4', 'jump'],
      ]
    : [
        ['tab', 'next'],
        ['⇧tab', 'back'],
        ['1-4', 'jump'],
      ]

  // The panel sits in the middle of the terminal; the outer box paints the whole alternate screen.
  return (
    <Backdrop.Provider value={color.panel}>
      <Box width={columns} height={rows} alignItems="center" justifyContent="center" backgroundColor={color.bg}>
        <Box
          flexDirection="column"
          width={width}
          borderStyle="round"
          borderColor={color.line}
          borderBackgroundColor={color.panel}
          backgroundColor={color.panel}
          paddingX={2}
        >
          <Box justifyContent="space-between">
            <Text color={color.accent} bold>
              ◆ Logbook
            </Text>
            <Box>
              {pages.map((name, index) => (
                <Text
                  key={name}
                  backgroundColor={index === page ? color.accent : undefined}
                  color={index === page ? color.ink : color.muted}
                  bold={index === page}
                >
                  {` ${name} `}
                </Text>
              ))}
            </Box>
          </Box>
          <Rule width={width - 6} top={0} bottom={1} />
          <Box minHeight={14} flexDirection="column">
            {loadError ? <Text color={color.danger}>{loadError}</Text> : null}
            {page === 0 ? <TodayPage {...props} active={!prompt} /> : null}
            {page === 1 ? <MonthPage {...props} active={!prompt} goToday={() => goTo(0)} /> : null}
            {page === 2 ? <YearPage {...props} active={!prompt} /> : null}
            {page === 3 ? (
              <MorePage
                {...props}
                active={!prompt}
                file={file}
                version={version}
                update={update}
                theme={painted}
                toggleVim={toggleVim}
                chooseTheme={chooseTheme}
              />
            ) : null}
          </Box>
          {prompt ? <PromptView key={asked.current} prompt={prompt} vim={vim} close={() => setPrompt(null)} /> : null}
          {flash ? (
            <Box marginTop={1}>
              <Text color={flash.ok ? color.success : color.danger} bold>
                {flash.ok ? '✓' : '✗'}{' '}
              </Text>
              <Text color={flash.ok ? color.text : color.danger}>{flash.text}</Text>
            </Box>
          ) : null}
          {update ? (
            <Text color={color.accent}>
              ↑ Logbook {update} is available ({version} installed). Run <Text bold>logbook update</Text>.
            </Text>
          ) : null}
          <Rule width={width - 6} top={1} bottom={0} />
          <Box justifyContent="space-between">
            <Keys items={pageKeys} />
            <Keys items={[['q', 'quit']]} />
          </Box>
        </Box>
      </Box>
    </Backdrop.Provider>
  )
}

// A divider across the panel's inside (its width less border and padding).
function Rule({ width, top, bottom }: { width: number; top: number; bottom: number }) {
  return (
    <Box marginTop={top} marginBottom={bottom}>
      <Text color={color.line}>{'─'.repeat(Math.max(0, width))}</Text>
    </Box>
  )
}

// Key caps on a raised surface, then what they do.
function Keys({ items }: { items: [string, string][] }) {
  return (
    <Box flexWrap="wrap" columnGap={2}>
      {items.map(([key, label]) => (
        <Box key={key} gap={1}>
          <Text backgroundColor={color.surface} color={color.accent} bold>
            {` ${key} `}
          </Text>
          <Text color={color.muted}>{label}</Text>
        </Box>
      ))}
    </Box>
  )
}

// A page's own keys, under its content. Hidden while a prompt is open, since they do nothing then and the space is needed.
function PageKeys({ items, active }: { items: [string, string][]; active: boolean }) {
  if (!active) return null
  return (
    <Box marginTop={1}>
      <Keys items={items} />
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
      if (input === 's' && day) apply(today, reset(day, true))
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
      <Box marginTop={1} gap={1}>
        <Text color={color.faint}>This month</Text>
        <MonthSummary days={days} year={Number(today.slice(0, 4))} month={Number(today.slice(5, 7)) - 1} today={today} />
      </Box>
      <PageKeys items={keys} active={active} />
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
      <Text bold color={color.accent}>
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
      <PageKeys items={keys} active={active} />
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
      <PageKeys
        active={active}
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
  theme,
  toggleVim,
  chooseTheme,
}: PageProps & {
  file: string
  version: string
  update: string | null
  theme: string
  toggleVim: () => void
  chooseTheme: () => void
}) {
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

  type Action = { section: string; label: string; value?: string; danger?: boolean; run: () => void }
  const actions: Action[] = [
    {
      section: 'Export',
      label: `Excel: ${today.slice(0, 7)}`,
      run: () => void save(`logbook-${today.slice(0, 7)}.xlsx`, toXlsx([excelMonthSheet(days, year, month, today)]), 'the month'),
    },
    {
      section: 'Export',
      label: `Excel: ${year}`,
      run: () =>
        void save(`logbook-${year}.xlsx`, toXlsx(excelSheets(days, { from: year, years: 1, weekends: true, split: true }, today)), 'the year'),
    },
    // Only offered once the log spans more than one year.
    ...(from < year
      ? [
          {
            section: 'Export',
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
    {
      section: 'Data',
      label: 'Save backup (JSON)',
      run: () => void save(`logbook-backup-${today}.json`, JSON.stringify(days), 'the backup'),
    },
    {
      section: 'Data',
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
      section: 'Data',
      label: 'Erase all data',
      danger: true,
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
    { section: 'Preferences', label: 'Theme', value: findTheme(theme)?.name, run: chooseTheme },
    { section: 'Preferences', label: 'Vim keys', value: vim ? 'on' : 'off', run: toggleVim },
    {
      section: 'App',
      label: update ? `Update to ${update}` : 'Check for updates',
      value: `v${version}`,
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
      {actions.map((action, index) => {
        const selected = index === cursor
        return (
          <Box key={action.label} flexDirection="column">
            {action.section !== actions[index - 1]?.section ? (
              <Box marginTop={index === 0 ? 0 : 1}>
                <Text color={color.faint} bold>
                  {action.section.toUpperCase()}
                </Text>
              </Box>
            ) : null}
            <Box justifyContent="space-between" backgroundColor={selected ? color.surface : undefined} paddingRight={1}>
              <Text color={action.danger ? color.danger : selected ? color.accent : color.text} bold={selected}>
                <Text color={color.accent}>{selected ? '▌ ' : '  '}</Text>
                {action.label}
              </Text>
              {action.value ? <Text color={selected ? color.text : color.muted}>{action.value}</Text> : null}
            </Box>
          </Box>
        )
      })}
      <Box marginTop={1}>
        <Text color={color.faint} wrap="truncate-middle">
          Log {file}
        </Text>
      </Box>
      <PageKeys
        active={active}
        items={[
          [vim ? 'j k' : '↑↓', 'choose'],
          ['enter', 'run'],
        ]}
      />
    </Box>
  )
}

// Long lists, such as themes, scroll so a prompt never pushes the panel off a small terminal.
const promptRows = 6

function PromptView({ prompt, vim, close }: { prompt: Prompt; vim: boolean; close: () => void }) {
  const backdrop = useContext(Backdrop)
  const [value, setValue] = useState(prompt.kind === 'text' ? (prompt.initial ?? '') : '')
  const [cursor, setCursor] = useState(prompt.kind === 'choice' ? (prompt.initial ?? 0) : 0)
  useInput((input, key) => {
    if (key.escape) {
      if (prompt.kind === 'choice') prompt.onCancel?.()
      return close()
    }
    if (prompt.kind === 'confirm') {
      if (input === 'y') {
        close()
        prompt.onYes()
      } else if (input === 'n') close()
    }
    if (prompt.kind === 'choice') {
      const count = prompt.options.length
      const move = moveOf(input, key, vim)
      if (move === 'up' || move === 'down') {
        const next = (cursor + (move === 'up' ? count - 1 : 1)) % count
        setCursor(next)
        prompt.onMove?.(next)
      }
      // Number keys pick straight away when every option has one.
      const picked = count <= 9 ? Number(input) - 1 : -1
      if (key.return || (picked >= 0 && picked < count)) {
        close()
        prompt.onPick(key.return ? cursor : picked)
      }
    }
  })
  const options = prompt.kind === 'choice' ? prompt.options : []
  const start = Math.max(0, Math.min(cursor - Math.floor(promptRows / 2), options.length - promptRows))
  const shown = options.slice(start, start + promptRows)
  const hint =
    prompt.kind === 'confirm' ? 'y yes · n no' : prompt.kind === 'choice' ? `${vim ? 'j k' : '↑↓'} choose · enter pick · esc cancel` : 'enter ok · esc cancel'
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={color.accent}
      borderBackgroundColor={backdrop}
      backgroundColor={color.surface}
      paddingX={1}
      marginTop={1}
    >
      <Text color={color.accent} bold>
        {prompt.label}
      </Text>
      {prompt.kind === 'text' ? (
        <Box marginTop={1}>
          <Text color={color.accent}>› </Text>
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
      {prompt.kind === 'choice' ? (
        <Box flexDirection="column">
          {start > 0 ? <Text color={color.faint}> ↑ {start} more</Text> : null}
          {shown.map((option, offset) => {
            const index = start + offset
            const selected = index === cursor
            return (
              <Text key={option} color={selected ? color.accent : color.text} bold={selected}>
                {selected ? '▌ ' : '  '}
                {options.length <= 9 ? <Text color={color.faint}>{index + 1} </Text> : null}
                {option}
              </Text>
            )
          })}
          {start + promptRows < options.length ? <Text color={color.faint}> ↓ {options.length - start - promptRows} more</Text> : null}
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text color={color.faint}>{hint}</Text>
      </Box>
    </Box>
  )
}
