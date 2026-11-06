import { formatLong, todayKey } from '@logbook/core'
import { useEffect, useState } from 'react'
import { useLog } from './log'

// The widget window: a header to drag it by, above the pages.
export function App() {
  const log = useLog()
  const [now, setNow] = useState(() => new Date())

  // Keeps the date current, including across midnight.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000)
    const wake = () => setNow(new Date())
    window.addEventListener('focus', wake)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', wake)
    }
  }, [])

  return (
    <main className="widget">
      <header data-tauri-drag-region>
        <div data-tauri-drag-region>
          <strong data-tauri-drag-region>Logbook</strong>
          <span data-tauri-drag-region className="faint">
            {formatLong(todayKey(now))}
          </span>
        </div>
      </header>
      {log.error ? <div className="banner">{log.error}</div> : null}
      <div className="pager" />
    </main>
  )
}
