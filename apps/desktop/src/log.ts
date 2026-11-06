import { cleanDay, cleanDays, isDateKey, type Day, type Days } from '@logbook/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { loadLog, saveLog } from './native'

export type Log = {
  ready: boolean
  writable: boolean
  days: Days
  error: string
  setDay: (date: string, day: Day | null) => void
  replaceAll: (days: Days) => void
}

// Same rules as the phone's store: a log that cannot be read turns editing off, so it is never overwritten.
export function useLog(): Log {
  const [ready, setReady] = useState(false)
  const [writable, setWritable] = useState(false)
  const [days, setDays] = useState<Days>({})
  const [error, setError] = useState('')
  const queue = useRef(Promise.resolve())

  useEffect(() => {
    let live = true
    loadLog()
      .then((raw) => {
        if (!live) return
        if (raw == null) return setWritable(true)
        const cleaned = cleanDays(JSON.parse(raw))
        if (!cleaned) return setError('The saved log is not readable, so editing is off and nothing was overwritten.')
        setDays(cleaned)
        setWritable(true)
      })
      .catch(() => {
        if (live) setError('The log could not be opened, so editing is off and nothing was overwritten.')
      })
      .finally(() => {
        if (live) setReady(true)
      })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (!writable) return
    const snapshot = JSON.stringify(days)
    queue.current = queue.current
      .catch(() => undefined)
      .then(() => saveLog(snapshot))
      .then(() => setError(''))
      .catch(() => setError('The last change could not be saved. It is still on screen.'))
  }, [days, writable])

  return useMemo<Log>(
    () => ({
      ready,
      writable,
      days,
      error,
      setDay: (date, day) => {
        if (!isDateKey(date)) return
        setDays((prev) => {
          const next = { ...prev }
          if (!day) {
            delete next[date]
            return next
          }
          const cleaned = cleanDay(day)
          if (!cleaned) return prev
          next[date] = cleaned
          return next
        })
      },
      replaceAll: setDays,
    }),
    [ready, writable, days, error],
  )
}
