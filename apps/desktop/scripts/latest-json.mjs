// Writes the update feed an installed widget reads (Tauri updater format).
//   node scripts/latest-json.mjs <version> <signature file> <bundle url> <output file> [notes]
// The universal bundle runs on both Apple Silicon and Intel, so both platforms point at it.
import { readFile, writeFile } from 'node:fs/promises'

const [version, signatureFile, url, output, notes = ''] = process.argv.slice(2)
if (!version || !signatureFile || !url || !output) {
  console.error('usage: latest-json.mjs <version> <signature file> <bundle url> <output file> [notes]')
  process.exit(1)
}
const signature = (await readFile(signatureFile, 'utf8')).trim()
const platform = { signature, url }
const feed = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: { 'darwin-aarch64': platform, 'darwin-x86_64': platform },
}
await writeFile(output, `${JSON.stringify(feed, null, 2)}\n`)
console.log(`Wrote ${output} for ${version}`)
