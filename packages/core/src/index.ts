// Platform-free attendance logic shared by every Logbook app: no React, no storage, no native modules.
// Explicit .ts extensions let Node run this source directly (CLI tests) as well as bundlers.
export * from './logic.ts'
export * from './xlsx.ts'
