import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { readSettings, writeSettings } from './settings.ts'

test('vim keys survive a restart, and a missing or broken settings file means they are off', async () => {
  const file = join(await mkdtemp(join(tmpdir(), 'logbook-')), 'nested', 'settings.json')
  assert.deepEqual(await readSettings(file), { vim: false })
  await writeSettings(file, { vim: true })
  assert.deepEqual(await readSettings(file), { vim: true })
  await writeFile(file, '{"vim": "yes"')
  assert.deepEqual(await readSettings(file), { vim: false })
  await writeFile(file, 'null')
  assert.deepEqual(await readSettings(file), { vim: false })
})
