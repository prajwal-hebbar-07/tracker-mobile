import { useEffect, useMemo, useState } from 'react'
import { checkUpdate, installUpdate } from './native'

export type Update = {
  available: string | null
  status: string
  busy: boolean
  check: () => void
  install: () => void
}

const sixHours = 6 * 60 * 60 * 1000

// Asks the release feed at launch and every six hours. Installing replaces the app and restarts it;
// the log lives outside the app, so it is untouched.
export function useUpdate(): Update {
  const [available, setAvailable] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const quiet = () => checkUpdate().then(setAvailable, () => undefined)
    void quiet()
    const id = setInterval(quiet, sixHours)
    return () => clearInterval(id)
  }, [])

  return useMemo<Update>(
    () => ({
      available,
      status,
      busy,
      check: () => {
        setBusy(true)
        setStatus('Checking…')
        checkUpdate()
          .then(
            (version) => {
              setAvailable(version)
              setStatus(version ? `Version ${version} is ready to install.` : 'You have the newest version.')
            },
            () => setStatus('Could not reach the release feed. Try again later.'),
          )
          .finally(() => setBusy(false))
      },
      install: () => {
        setBusy(true)
        setStatus('Downloading the update…')
        installUpdate().catch((error: unknown) => {
          setStatus(`The update did not install: ${String(error)}`)
          setBusy(false)
        })
      },
    }),
    [available, status, busy],
  )
}
