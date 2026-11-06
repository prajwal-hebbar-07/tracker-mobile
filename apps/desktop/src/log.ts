import { cleanDay, cleanDays, isDateKey, type Day, type Days } from '@logbook/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { loadLog, saveLog, updateDay } from './native'

export type Log = {
  ready: boolean
  writable: boolean
  days: Days
  error: string
  setDay: (date: string, day: Day | null) => void
  replaceAll: (days: Days) => void
}

const unreadable = 'The saved log is not readable, so editing is off and nothing was overwritten.'

// The `logbook` CLI shares this file, so the page saves one day at a time against the file as it is
// and picks up the CLI's changes by re-reading it. Same rule as the phone: a log that cannot be read
// turns editing off, so it is never overwritten.
export function useLog(): Log {
  const [ready, setReady] = useState(false)
  const [writable, setWritable] = useState(false)
  const [days, setDays] = useState<Days>({})
  const [error, setError] = useState('')
  // The file text last read or written here; a different text on disk means another program changed it.
  const seen = useRef<string | null>(null)

  useEffect(() => {
    let live = true
    const sync = () =>
      loadLog()
        .then((raw) => {
          if (!live || raw === seen.current) return
          seen.current = raw
          const cleaned = raw == null ? {} : cleanDays(JSON.parse(raw))
          if (!cleaned) {
            setWritable(false)
            return setError(unreadable)
          }
          setDays(cleaned)
          setWritable(true)
          setError('')
        })
        .catch(() => {
          if (live) setError('The log could not be opened, so editing is off and nothing was overwritten.')
        })
        .finally(() => {
          if (live) setReady(true)
        })
    void sync()
    const id = setInterval(sync, 3000)
    window.addEventListener('focus', sync)
    return () => {
      live = false
      clearInterval(id)
      window.removeEventListener('focus', sync)
    }
  }, [])

  return useMemo<Log>(
    () => ({
      ready,
      writable,
      days,
      error,
      setDay: (date, day) => {
        if (!writable || !isDateKey(date)) return
        const cleaned = day ? cleanDay(day) : null
        if (day && !cleaned) return
        // Shown at once; the file's answer then replaces it, including anything the CLI added meanwhile.
        setDays((prev) => {
          const next = { ...prev }
          if (cleaned) next[date] = cleaned
          else delete next[date]
          return next
        })
        updateDay(date, cleaned)
          .then((raw) => {
            seen.current = raw
            setDays(cleanDays(JSON.parse(raw)) ?? {})
            setError('')
          })
          .catch(() => setError('The last change could not be saved. Reopen the widget to see the saved log.'))
      },
      replaceAll: (next) => {
        if (!writable) return
        const raw = JSON.stringify(next)
        setDays(next)
        saveLog(raw)
          .then(() => {
            seen.current = raw
            setError('')
          })
          .catch(() => setError('The restored log could not be saved. It is still on screen.'))
      },
    }),
    [ready, writable, days, error],
  )
}
