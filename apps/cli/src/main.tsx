import {
  cleanDays,
  excelLabel,
  excelMonthSheet,
  excelSheets,
  isDateKey,
  leaveDates,
  leaveTypes,
  plural,
  timeNow,
  todayKey,
  toXlsx,
  type Days,
  type LeaveType,
} from '@logbook/core'
import { Box, render, renderToString, Text } from 'ink'
import { readFile, writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { parseArgs } from 'node:util'
import type { ReactNode } from 'react'
import { clockIn, clockOut, reset, takeLeave, takeLeaveRange, workFromHome, type Change } from './actions.ts'
import { App } from './App.tsx'
import { logFile } from './paths.ts'
import { readLog, replaceLog, setDay, setDays } from './store.ts'
import { color } from './theme.ts'
import { pendingUpdate, refreshCache, selfUpdate } from './update.ts'
import { MonthView, Status, YearView } from './views.tsx'

declare const __VERSION__: string
const version = __VERSION__

const help = `Logbook: attendance and leave from the terminal. Shares its log with the Mac widget.

  logbook                         open the interactive view
  logbook status                  today and this month
  logbook in [HH:MM]              clock in now or at a time (again to fix the time)
  logbook out [HH:MM]             clock out (again to fix the time)
  logbook home                    work from home today
  logbook leave TYPE [--date YYYY-MM-DD] [--note TEXT] [--replace]
                                  TYPE: ${leaveTypes.map((item) => item.id).join(', ')}
  logbook leave TYPE --from YYYY-MM-DD [--to YYYY-MM-DD] [--weekends] [--note TEXT] [--replace]
                                  leave on every working day of a range (--from defaults to today,
                                  --to to --from); --weekends counts Saturday and Sunday too
  logbook reset [--date YYYY-MM-DD]
                                  start today over, or remove leave on another day
  logbook month [YYYY-MM]         a month's calendar
  logbook year [YYYY]             a year's totals and months
  logbook export [--month YYYY-MM | --year YYYY | --from YYYY --years N]
                 [--no-weekends] [--one-sheet] [-o FILE]
                                  Excel workbook, one row per day (default: this year)
  logbook backup [-o FILE]        JSON backup (to stdout without -o)
  logbook restore FILE [--yes]    replace the log with a backup
  logbook update                  install the newest release
  logbook version

Log file: ${logFile()} (set LOGBOOK_FILE to use another).`

class Problem extends Error {}

function print(node: ReactNode) {
  process.stdout.write(`${renderToString(node, { columns: Math.min(process.stdout.columns || 80, 80) })}\n`)
}

function say(change: Change) {
  if (!change.ok) throw new Problem(change.message)
  print(<Text color={color.success}>✓ {change.message}</Text>)
}

function dateOption(value: string | undefined, today: string): string {
  if (value == null) return today
  if (!isDateKey(value)) throw new Problem(`${value} is not a date. Use YYYY-MM-DD.`)
  return value
}

async function confirm(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) throw new Problem('Add --yes to confirm when not running in a terminal.')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`${question} [y/N] `)
  rl.close()
  return answer.trim().toLowerCase().startsWith('y')
}

async function change(file: string, date: string, decide: (days: Days) => Change) {
  const result = decide(await readLog(file))
  if (result.ok) await setDay(file, date, result.day)
  say(result)
}

async function run(argv: string[]) {
  const file = logFile()
  const now = new Date()
  const today = todayKey(now)
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      date: { type: 'string' },
      to: { type: 'string' },
      weekends: { type: 'boolean', default: false },
      note: { type: 'string', default: '' },
      replace: { type: 'boolean', default: false },
      month: { type: 'string' },
      year: { type: 'string' },
      from: { type: 'string' },
      years: { type: 'string' },
      'no-weekends': { type: 'boolean', default: false },
      'one-sheet': { type: 'boolean', default: false },
      output: { type: 'string', short: 'o' },
      yes: { type: 'boolean', short: 'y', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
  })
  const [command = '', arg] = positionals
  if (values.help || command === 'help') return console.log(help)
  if (values.version || command === 'version') return console.log(version)

  switch (command) {
    case '': {
      if (!process.stdin.isTTY || !process.stdout.isTTY) return run(['status'])
      const app = render(<App file={file} version={version} update={await pendingUpdate(version)} />, { alternateScreen: true })
      return app.waitUntilExit()
    }
    case 'status': {
      const days = await readLog(file)
      return print(
        <Box flexDirection="column" alignSelf="flex-start" borderStyle="round" borderColor={color.line} paddingX={2} gap={1}>
          <Status day={days[today]} now={now} today={today} />
          <MonthView days={days} year={now.getFullYear()} month={now.getMonth()} today={today} />
        </Box>,
      )
    }
    case 'in':
      return change(file, today, (days) => clockIn(days[today], arg, timeNow(now)))
    case 'out':
      return change(file, today, (days) => clockOut(days[today], arg, timeNow(now)))
    case 'home':
      return change(file, today, (days) => workFromHome(days[today]))
    case 'leave': {
      const type = leaveTypes.find((item) => item.id === arg)?.id as LeaveType | undefined
      if (!type) throw new Problem(`Pick a leave type: ${leaveTypes.map((item) => item.id).join(', ')}.`)
      const note = values.note ?? ''
      const replace = values.replace ?? false
      if (values.from == null && values.to == null) {
        const date = dateOption(values.date, today)
        return change(file, date, (days) => takeLeave(days[date], type, note, replace))
      }
      if (values.date != null) throw new Problem('Use --date for one day, or --from and --to for a range, not both.')
      const from = dateOption(values.from, today)
      const to = dateOption(values.to, from)
      if (to < from) throw new Problem(`--to ${to} is before --from ${from}.`)
      const result = takeLeaveRange(await readLog(file), leaveDates(from, to, values.weekends ?? false), type, note, replace)
      if (result.ok) await setDays(file, result.days)
      return say(result.ok ? { ok: true, day: null, message: result.message } : result)
    }
    case 'reset': {
      const date = dateOption(values.date, today)
      return change(file, date, (days) => reset(days[date], date === today))
    }
    case 'month': {
      const key = arg ?? today.slice(0, 7)
      if (!/^\d{4}-\d{2}$/.test(key)) throw new Problem(`${key} is not a month. Use YYYY-MM.`)
      const days = await readLog(file)
      return print(<MonthView days={days} year={Number(key.slice(0, 4))} month={Number(key.slice(5, 7)) - 1} today={today} />)
    }
    case 'year': {
      const year = Number(arg ?? today.slice(0, 4))
      if (!Number.isInteger(year) || year < 1000) throw new Problem(`${arg} is not a year.`)
      return print(<YearView days={await readLog(file)} year={year} today={today} />)
    }
    case 'export': {
      const days = await readLog(file)
      let name: string
      let bytes: Uint8Array
      if (values.month) {
        if (!/^\d{4}-\d{2}$/.test(values.month)) throw new Problem(`${values.month} is not a month. Use YYYY-MM.`)
        const [year, month] = values.month.split('-').map(Number)
        name = `logbook-${values.month}.xlsx`
        bytes = toXlsx([excelMonthSheet(days, year, month - 1, today)])
      } else {
        const from = Number(values.from ?? values.year ?? today.slice(0, 4))
        const years = Number(values.years ?? 1)
        if (!Number.isInteger(from) || !Number.isInteger(years) || years < 1 || years > 10) {
          throw new Problem('Use --year YYYY, or --from YYYY with --years 1 to 10.')
        }
        const options = { from, years, weekends: !values['no-weekends'], split: !values['one-sheet'] }
        name = `logbook-${excelLabel(options).replace('–', '-')}.xlsx`
        bytes = toXlsx(excelSheets(days, options, today))
      }
      const path = values.output ?? name
      await writeFile(path, bytes)
      return say({ ok: true, day: null, message: `Saved ${path}` })
    }
    case 'backup': {
      const json = JSON.stringify(await readLog(file), null, 2)
      if (!values.output) return process.stdout.write(`${json}\n`)
      await writeFile(values.output, json)
      return say({ ok: true, day: null, message: `Saved ${values.output}` })
    }
    case 'restore': {
      if (!arg) throw new Problem('Give the backup file: logbook restore FILE')
      let days: Days | null = null
      try {
        days = cleanDays(JSON.parse(await readFile(arg, 'utf8')))
      } catch {
        days = null
      }
      const count = days ? Object.keys(days).length : 0
      if (!days || count === 0) throw new Problem('Nothing in that file could be read. The log was left as it is.')
      if (!values.yes && !(await confirm(`Replace the log with ${plural(count, 'day')}?`))) return console.log('Nothing was changed.')
      await replaceLog(file, days)
      return say({ ok: true, day: null, message: `Restored ${plural(count, 'day')}.` })
    }
    case 'update':
      return say({ ok: true, day: null, message: await selfUpdate(version) })
    default:
      throw new Problem(`Unknown command "${command}". Run logbook help.`)
  }
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv[0] === '__check-update') return refreshCache().catch(() => undefined)
  try {
    await run(argv)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${renderToString(<Text color={color.danger}>✗ {message}</Text>)}\n`)
    process.exitCode = 1
  }
  // The interactive view shows the notice itself; one-shot commands print it after their output.
  if (argv.length > 0 && argv[0] !== 'update' && process.stderr.isTTY) {
    const latest = await pendingUpdate(version).catch(() => null)
    if (latest) {
      process.stderr.write(
        `${renderToString(
          <Box alignSelf="flex-start" borderStyle="round" borderColor={color.office} paddingX={1} marginTop={1}>
            <Text color={color.office}>
              Logbook {latest} is available ({version} installed). Run <Text bold>logbook update</Text>
            </Text>
          </Box>,
        )}\n`,
      )
    }
  }
}

await main()
