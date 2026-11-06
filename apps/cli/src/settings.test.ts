import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { readSettings, writeSettings } from './settings.ts'

const defaults = { vim: false, theme: 'logbook' }

test('preferences survive a restart, and a missing or broken settings file means the defaults', async () => {
  const file = join(await mkdtemp(join(tmpdir(), 'logbook-')), 'nested', 'settings.json')
  assert.deepEqual(await readSettings(file), defaults)
  await writeSettings(file, { vim: true, theme: 'tokyonight' })
  assert.deepEqual(await readSettings(file), { vim: true, theme: 'tokyonight' })
  await writeFile(file, '{"vim": "yes"')
  assert.deepEqual(await readSettings(file), defaults)
  await writeFile(file, 'null')
  assert.deepEqual(await readSettings(file), defaults)
})

test('a theme this version does not know falls back without losing the other preferences', async () => {
  const file = join(await mkdtemp(join(tmpdir(), 'logbook-')), 'settings.json')
  await writeFile(file, JSON.stringify({ vim: true, theme: 'solarized-neon' }))
  assert.deepEqual(await readSettings(file), { vim: true, theme: 'logbook' })
})
