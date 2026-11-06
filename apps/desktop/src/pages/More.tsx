import { cleanDays, excelMonthSheet, excelSheets, maxExcelYears, plural, todayKey, toXlsx, type Days } from '@logbook/core'
import { mdiBackupRestore, mdiContentCopy, mdiDatabaseExportOutline, mdiFileOutline, mdiMicrosoftExcel, mdiPower } from '@mdi/js'
import { useState } from 'react'
import type { Log } from '../log'
import { canQuit, openBackup, quit, saveFile } from '../native'
import { Button, useConfirm } from '../ui'

type Message = { ok: boolean; text: string } | null

// Exports use the same workbook as the phone. Backups are the phone's JSON, so a log moves either way.
export function More({ log, now }: { log: Log; now: Date }) {
  const today = todayKey(now)
  const year = now.getFullYear()
  const month = now.getMonth()
  const [message, setMessage] = useState<Message>(null)
  const [pasting, setPasting] = useState(false)
  const [paste, setPaste] = useState('')
  const [dialog, confirm] = useConfirm()
  const firstYear = Number((Object.keys(log.days).sort()[0] ?? today).slice(0, 4))
  const from = Math.max(firstYear, year - maxExcelYears + 1)

  async function save(name: string, bytes: Uint8Array, what: string) {
    setMessage(null)
    try {
      if (await saveFile(name, bytes)) setMessage({ ok: true, text: `Saved ${what}.` })
    } catch {
      setMessage({ ok: false, text: `Could not save ${what}. Nothing was changed.` })
    }
  }

  function restore(text: string) {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      return setMessage({ ok: false, text: 'That is not a backup. Use the JSON from “Share backup” on the phone.' })
    }
    const cleaned: Days | null = cleanDays(parsed)
    const count = cleaned ? Object.keys(cleaned).length : 0
    if (!cleaned || count === 0) return setMessage({ ok: false, text: 'Nothing in that backup could be read. The log was left as it is.' })
    confirm({
      title: 'Replace the log on this Mac?',
      message: `${plural(count, 'day')} will replace everything stored now.`,
      action: 'Replace',
      onConfirm: () => {
        log.replaceAll(cleaned)
        setPaste('')
        setPasting(false)
        setMessage({ ok: true, text: `Restored ${plural(count, 'day')}.` })
      },
    })
  }

  const backup = JSON.stringify(log.days)

  return (
    <div className="stack">
      <span className="label">Excel</span>
      <div className="row">
        <Button
          label="Month"
          icon={mdiMicrosoftExcel}
          grow
          onClick={() => {
            const prefix = today.slice(0, 7)
            void save(`logbook-${prefix}.xlsx`, toXlsx([excelMonthSheet(log.days, year, month, today)]), 'the month')
          }}
        />
        <Button
          label="Year"
          icon={mdiMicrosoftExcel}
          grow
          onClick={() =>
            void save(`logbook-${year}.xlsx`, toXlsx(excelSheets(log.days, { from: year, years: 1, weekends: true, split: true }, today)), 'the year')
          }
        />
        <Button
          label="All"
          icon={mdiMicrosoftExcel}
          grow
          onClick={() =>
            void save(
              `logbook-${from}-${year}.xlsx`,
              toXlsx(excelSheets(log.days, { from, years: year - from + 1, weekends: true, split: true }, today)),
              'every year',
            )
          }
        />
      </div>

      <span className="label">Backup</span>
      <div className="row">
        <Button
          label="Save"
          icon={mdiDatabaseExportOutline}
          grow
          onClick={() => void save(`logbook-backup-${today}.json`, new TextEncoder().encode(backup), 'the backup')}
        />
        <Button
          label="Copy"
          icon={mdiContentCopy}
          grow
          onClick={() =>
            navigator.clipboard.writeText(backup).then(
              () => setMessage({ ok: true, text: 'Backup copied. Paste it into Restore on the phone.' }),
              () => setMessage({ ok: false, text: 'Could not copy the backup.' }),
            )
          }
        />
      </div>

      <span className="label">Restore</span>
      {pasting ? (
        <>
          <textarea value={paste} onChange={(event) => setPaste(event.target.value)} placeholder="Paste a backup here" rows={3} />
          <div className="row">
            <Button label="Cancel" grow onClick={() => setPasting(false)} />
            <Button label="Restore" icon={mdiBackupRestore} variant="danger" grow disabled={!paste.trim()} onClick={() => restore(paste)} />
          </div>
        </>
      ) : (
        <div className="row">
          <Button
            label="Open file"
            icon={mdiFileOutline}
            grow
            onClick={() =>
              openBackup().then(
                (text) => text != null && restore(text),
                () => setMessage({ ok: false, text: 'Could not read that file.' }),
              )
            }
          />
          <Button label="Paste" icon={mdiBackupRestore} grow onClick={() => setPasting(true)} />
        </div>
      )}

      {message ? <div className={message.ok ? 'ok' : 'danger'}>{message.text}</div> : null}
      {canQuit ? <Button label="Quit widget" icon={mdiPower} variant="ghost" tint="var(--muted)" onClick={quit} /> : null}
      {dialog}
    </div>
  )
}
