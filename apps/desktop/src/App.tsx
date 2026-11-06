import { formatLong, todayKey } from '@logbook/core'
import { useEffect, useRef, useState } from 'react'
import { useLog } from './log'
import { Month } from './pages/Month'
import { More } from './pages/More'
import { Today } from './pages/Today'
import { Year } from './pages/Year'
import { useUpdate } from './update'

const pages = ['Today', 'Month', 'Year', 'More'] as const

// One page per screen; swipe sideways on the trackpad, click a dot, or use ← →.
export function App() {
  const log = useLog()
  const update = useUpdate()
  const [now, setNow] = useState(() => new Date())
  const [page, setPage] = useState(0)
  const pager = useRef<HTMLDivElement>(null)

  // Keeps the running timer and the date current, including across midnight.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000)
    const wake = () => setNow(new Date())
    window.addEventListener('focus', wake)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', wake)
    }
  }, [])

  function goTo(index: number) {
    const el = pager.current
    if (!el) return
    const next = Math.max(0, Math.min(pages.length - 1, index))
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === 'ArrowRight') goTo(page + 1)
      if (event.key === 'ArrowLeft') goTo(page - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [page])

  return (
    <main className="widget">
      <header data-tauri-drag-region>
        <div data-tauri-drag-region>
          <strong data-tauri-drag-region>{pages[page]}</strong>
          <span data-tauri-drag-region className="faint">
            {formatLong(todayKey(now))}
          </span>
        </div>
        <nav className="dots" aria-label="Pages">
          {pages.map((name, index) => (
            <button
              key={name}
              type="button"
              className={index === page ? 'dot active' : 'dot'}
              aria-label={name}
              aria-current={index === page ? 'page' : undefined}
              onClick={() => goTo(index)}
            />
          ))}
        </nav>
      </header>
      {log.error ? <div className="banner">{log.error}</div> : null}
      {update.available && page !== 3 ? (
        <button type="button" className="banner update" onClick={() => goTo(3)}>
          Version {update.available} is ready · Update on More
        </button>
      ) : null}
      <div
        ref={pager}
        className="pager"
        onScroll={(event) => setPage(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}
      >
        {log.ready ? (
          <>
            <section className="page" aria-label="Today">
              <Today log={log} now={now} />
            </section>
            <section className="page" aria-label="Month">
              <Month log={log} now={now} onToday={() => goTo(0)} />
            </section>
            <section className="page" aria-label="Year">
              <Year log={log} now={now} />
            </section>
            <section className="page" aria-label="More">
              <More log={log} now={now} update={update} />
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}
