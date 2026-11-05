import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cleanDay, cleanDays, isDateKey, type Day, type Days } from '@/logic'

const KEY = 'logbook.days.v1'

type Store = {
  ready: boolean
  writable: boolean
  days: Days
  error: string
  generation: number
  setDay: (date: string, day: Day | null) => void
  replaceAll: (days: Days) => void
}

const Ctx = createContext<Store | null>(null)

export function DaysProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [writable, setWritable] = useState(false)
  const [days, setDays] = useState<Days>({})
  const [error, setError] = useState('')
  const [generation, setGeneration] = useState(0)
  const queue = useRef(Promise.resolve())

  useEffect(() => {
    let live = true
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!live) return
        if (raw == null) {
          setWritable(true)
          return
        }
        const cleaned = cleanDays(JSON.parse(raw))
        // A failed read must not fall through into the save effect, or it would replace the file with {}.
        if (!cleaned) {
          setError('The saved log is not readable, so editing is off and nothing was overwritten.')
          return
        }
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
    const snapshot = days
    queue.current = queue.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(KEY, JSON.stringify(snapshot)))
      .then(() => setError(''))
      .catch(() => setError('The last change could not be saved. It is still on screen.'))
  }, [days, writable])

  const api = useMemo<Store>(
    () => ({
      ready,
      writable,
      days,
      error,
      generation,
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
      replaceAll: (next) => {
        setDays(next)
        setGeneration((value) => value + 1)
      },
    }),
    [ready, writable, days, error, generation],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useDays(): Store {
  const store = useContext(Ctx)
  if (!store) throw new Error('useDays must be used inside DaysProvider')
  return store
}
