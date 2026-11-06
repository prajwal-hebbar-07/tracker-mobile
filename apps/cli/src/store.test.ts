import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { readLog, setDay, UnreadableLog } from './store.ts'

const fresh = async () => join(await mkdtemp(join(tmpdir(), 'logbook-')), 'nested', 'days.json')

test('a day written by the widget after the CLI last read the log is kept', async () => {
  const file = await fresh()
  await setDay(file, '2026-11-02', { kind: 'wfh' })
  // The widget writes its own day straight to the file.
  await writeFile(file, JSON.stringify({ '2026-11-02': { kind: 'wfh' }, '2026-11-03': { kind: 'leave', leaveType: 'sick' } }))
  const days = await setDay(file, '2026-11-04', { kind: 'office', in: '09:00' })
  assert.deepEqual(Object.keys(days).sort(), ['2026-11-02', '2026-11-03', '2026-11-04'])
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), days)
})

test('a log that is not a log is never overwritten', async () => {
  const file = await fresh()
  await setDay(file, '2026-11-02', { kind: 'wfh' })
  await writeFile(file, '{"2026-11-02": {"kind": "wfh"}')
  await assert.rejects(setDay(file, '2026-11-03', { kind: 'wfh' }), UnreadableLog)
  assert.equal(await readFile(file, 'utf8'), '{"2026-11-02": {"kind": "wfh"}')
  await writeFile(file, '[1, 2]')
  await assert.rejects(readLog(file), UnreadableLog)
})

test('removing a day leaves the others, and bad dates are refused', async () => {
  const file = await fresh()
  assert.deepEqual(await readLog(file), {})
  await setDay(file, '2026-11-02', { kind: 'wfh' })
  await setDay(file, '2026-11-03', { kind: 'wfh' })
  assert.deepEqual(Object.keys(await setDay(file, '2026-11-02', null)), ['2026-11-03'])
  await assert.rejects(setDay(file, '2026-02-30', { kind: 'wfh' }))
})
