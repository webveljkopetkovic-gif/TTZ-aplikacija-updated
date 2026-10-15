import { useState } from 'react'
import { useSession } from '@/api/auth'
import { useDisablePush, useEnablePush, usePushState } from '@/api/push'
import { ErrorNote, Panel } from '@/components/client/ui'
import { Button } from '@/components/ui'
import { detectPlatform, isStandalone, type Platform } from '@/lib/install'

const DISMISS_KEY = 'ttz-app-setup-dismissed'

const STEPS: Record<Exclude<Platform, 'other'>, string[]> = {
  android: [
    'Otvori ovu stranicu u Chrome-u.',
    'Dodirni meni ⋮ gore desno.',
    'Izaberi „Instaliraj aplikaciju“ ili „Dodaj na početni ekran“.',
    'Potvrdi. TTZ ikonica se pojavljuje na početnom ekranu.',
  ],
  ios: [
    'Otvori ovu stranicu u Safari-ju (ne u drugom pregledaču).',
    'Dodirni dugme za deljenje □↑ na dnu ekrana.',
    'Izaberi „Dodaj na početni ekran“ (Add to Home Screen).',
    'Dodirni „Dodaj“. Aplikaciju otvaraš sa nove ikonice, ne iz Safari-ja.',
  ],
}

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** Kartica na Početnoj: kako da dodaš aplikaciju na početni ekran i uključiš podsetnike (web push). */
export function AppSetup() {
  const session = useSession()
  const push = usePushState()
  const enable = useEnablePush(session.data?.user.id)
  const disable = useDisablePush()
  const [dismissed, setDismissed] = useState(readDismissed)
  const [error, setError] = useState<string>()

  const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints)
  const installed = isStandalone()
  const state = push.data
  // na iPhone-u push radi tek iz instalirane aplikacije, pa se prvo nudi instalacija
  const canPush = state === 'off' && (platform !== 'ios' || installed)
  const showInstall = !installed && platform !== 'other'
  if (dismissed || (!showInstall && !canPush && state !== 'on')) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // bez trajnog čuvanja kartica se samo sakrije do sledećeg otvaranja
    }
    setDismissed(true)
  }

  return (
    <Panel className="mt-4">
      <h2 className="text-xl font-extrabold">Aplikacija na telefonu</h2>
      {showInstall && (
        <>
          <p className="mt-1 text-muted">
            Dodaj TTZ na početni ekran: otvara se kao prava aplikacija, brzo i preko celog ekrana.
          </p>
          <ol className="mt-3 list-decimal pl-5">
            {STEPS[platform as 'android' | 'ios'].map((s) => (
              <li key={s} className="py-0.5">
                {s}
              </li>
            ))}
          </ol>
        </>
      )}
      {canPush && (
        <div className="mt-4">
          <p className="text-muted">
            Dobijaj podsetnik za feedback i odgovor tima kao obaveštenje.
          </p>
          <Button
            block
            className="mt-3"
            disabled={enable.isPending}
            onClick={() => {
              setError(undefined)
              enable.mutate(undefined, { onError: (e) => setError(e.message) })
            }}
          >
            {enable.isPending ? 'Uključujem…' : 'Uključi obaveštenja'}
          </Button>
        </div>
      )}
      {state === 'on' && (
        <div className="mt-4">
          <p>Obaveštenja su uključena na ovom telefonu.</p>
          <Button
            variant="soft"
            className="mt-3"
            disabled={disable.isPending}
            onClick={() => disable.mutate()}
          >
            Isključi obaveštenja
          </Button>
        </div>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button variant="soft" className="mt-3" onClick={dismiss}>
        Sakrij
      </Button>
    </Panel>
  )
}
