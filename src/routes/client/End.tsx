import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useSignOut } from '@/api/auth'
import {
  openReportPdf,
  useProgramReport,
  useProgramResults,
  useRenewProgram,
  type Recommendation,
} from '@/api/end'
import { ApiError } from '@/api/functions'
import { formatRsd, useProducts } from '@/api/products'
import { ErrorNote, Loading, Panel, Pill, Screen } from '@/components/client/ui'
import { Avatar, Button } from '@/components/ui'
import { useMyProgram } from '@/hooks/useMyProgram'
import { cn } from '@/lib/cn'
import { firstName } from '@/lib/labels'
import { daysLeft, programPhase } from '@/lib/programDay'
import { homeForStatus } from '@/lib/programHome'
import { change, formatChange, resultsSummary } from '@/lib/programResults'

type Option = Exclude<Recommendation, 'end'> | 'end'

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="min-w-0 rounded-card bg-card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={cn('mt-1 whitespace-nowrap text-xl font-extrabold', good && 'text-brand-text')}>
        {value}
      </p>
    </div>
  )
}

/** Dan 30 · kraj programa (design/Dan 30 · kraj programa.png): rezultati, izveštaj tima i izbor nastavka. */
export default function End() {
  const navigate = useNavigate()
  const my = useMyProgram()
  const program = my.program
  const results = useProgramResults(program?.id)
  const report = useProgramReport(program?.id)
  const products = useProducts()
  const renew = useRenewProgram()
  const signOut = useSignOut()
  const [choice, setChoice] = useState<Option>()
  const [error, setError] = useState<string>()
  const [pdfError, setPdfError] = useState(false)

  if (my.isPending) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }
  if (!program) return <Navigate to="/app" replace />
  const phase = programPhase(my.day, my.duration)
  if (program.status === 'active' && phase === 'active') return <Navigate to="/app/danas" replace />
  if (['awaiting_payment', 'building_plan', 'ready'].includes(program.status)) {
    return <Navigate to={homeForStatus(program.status)} replace />
  }

  const name = firstName(my.profile?.full_name)
  const published = report.data?.published_at ? report.data : null
  const finished = my.day >= my.duration || program.status !== 'active'
  const left = daysLeft(my.day, my.duration)
  // pregled plana dok traje čitanje (30 dana posle kraja) ili dok je program aktivan
  const canBrowse = program.status === 'active' || phase === 'read_only' || phase === 'ending'

  const kind = program.products?.kind
  const sameKind = products.data?.find((p) => p.kind === kind)
  const nutritionOnly = products.data?.find((p) => p.kind === 'nutrition')
  const options: { value: Option; title: string; text: string; price?: number }[] = [
    {
      value: 'continue',
      title: 'Nastavi 30 dana',
      text:
        kind === 'nutrition_training'
          ? 'Novi plan po rezultatima, ponovo od dana 1. Vežbe na sledećem nivou.'
          : 'Novi plan po rezultatima, ponovo od dana 1.',
      price: sameKind?.price_rsd,
    },
    ...(kind === 'nutrition_training'
      ? [
          {
            value: 'nutrition_only' as const,
            title: 'Samo ishrana · 30 dana',
            text: 'Novi plan ishrane i suplementi, bez vežbi.',
            price: nutritionOnly?.price_rsd,
          },
        ]
      : []),
    {
      value: 'end',
      title: 'Završavam za sada',
      text: 'Plan i izveštaj ostaju ti za čitanje još 30 dana.',
    },
  ]
  const recommended: Option = report.data?.recommendation ?? 'continue'
  const selected = choice ?? recommended

  const r = results.data
  const weight = r ? change(r.start_weight_kg, r.end_weight_kg) : null
  const waist = r ? change(r.start_waist_cm, r.end_waist_cm) : null

  const proceed = async () => {
    setError(undefined)
    if (selected === 'end') return navigate(canBrowse ? '/app/danas' : '/app/kraj')
    try {
      await renew.mutateAsync({ program_id: program.id, option: selected })
      navigate('/app') // novi program čeka uplatu
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Nastavak nije napravljen. Pokušaj ponovo.')
    }
  }

  return (
    <Screen className="pb-10">
      <header className="flex items-center gap-3">
        {canBrowse && (
          <Link
            to="/app/danas"
            aria-label="Nazad"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card"
          >
            ‹
          </Link>
        )}
        <p className="font-extrabold uppercase tracking-wide text-muted">
          Dan {Math.min(Math.max(my.day, 1), my.duration)} od {my.duration}
        </p>
      </header>

      <section className="mt-5 rounded-card-lg bg-brand p-6 text-ink">
        <h1 className="text-3xl font-extrabold leading-tight">
          {finished
            ? `Bravo, ${name}! Program je završen.`
            : `Još ${left} ${left === 1 ? 'dan' : 'dana'} do kraja, ${name}!`}
        </h1>
        {r && (
          <p className="mt-2 text-lg font-bold">
            {resultsSummary(r, kind === 'nutrition_training')}
          </p>
        )}
      </section>

      {results.isPending && <Loading />}
      {r && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Težina" value={formatChange(weight, 'kg')} good={(weight ?? 0) < 0} />
          <Stat label="Struk" value={formatChange(waist, 'cm')} good={(waist ?? 0) < 0} />
          <Stat label="Plan praćen" value={`${r.followed_days}/${r.duration_days} d`} />
        </div>
      )}

      <Panel className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-extrabold">Završni izveštaj tima</h2>
          <span className="text-sm text-muted">WhatsApp + email</span>
        </div>
        {published ? (
          <>
            <div className="mt-4 flex items-start gap-3">
              <Avatar name="Olgica" tone="olgica" />
              <p>
                <strong className="text-brand-text">Olgica:</strong> {published.nutrition_note}
              </p>
            </div>
            {kind === 'nutrition_training' && published.training_note && (
              <div className="mt-4 flex items-start gap-3">
                <Avatar name="Ognjen" tone="ognjen" />
                <p>
                  <strong>Ognjen:</strong> {published.training_note}
                </p>
              </div>
            )}
            {published.pdf_path && (
              <Button
                variant="soft"
                block
                className="mt-5 min-h-[52px] bg-bg font-extrabold"
                onClick={() => {
                  setPdfError(false)
                  openReportPdf(published.pdf_path!).catch(() => setPdfError(true))
                }}
              >
                Preuzmi izveštaj (PDF)
              </Button>
            )}
            {pdfError && <ErrorNote>Izveštaj se nije otvorio. Pokušaj ponovo.</ErrorNote>}
          </>
        ) : (
          <p className="mt-3 text-muted">
            Olgica{kind === 'nutrition_training' ? ' i Ognjen' : ''} pišu tvoj završni izveštaj.
            Stiže porukom, najkasnije u roku od 48 sati posle završnog feedbacka.
          </p>
        )}
      </Panel>

      <h2 className="mt-8 text-2xl font-extrabold">Šta dalje?</h2>
      <div role="radiogroup" aria-label="Šta dalje" className="mt-3 flex flex-col gap-3">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected === o.value}
            onClick={() => setChoice(o.value)}
            className={cn(
              'relative rounded-card-lg bg-card p-5 text-left',
              selected === o.value ? 'border-2 border-chart' : 'border border-line',
            )}
          >
            {recommended === o.value && (
              <span className="absolute -top-3 right-4">
                <Pill>PREPORUKA</Pill>
              </span>
            )}
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-xl font-extrabold">{o.title}</span>
              {o.price !== undefined && (
                <span className="shrink-0 font-extrabold">{formatRsd(o.price)}</span>
              )}
            </span>
            <span className="mt-1 block text-muted">{o.text}</span>
          </button>
        ))}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      {selected === 'end' ? (
        canBrowse && (
          <Link
            to="/app/danas"
            className="mt-6 flex min-h-[56px] items-center justify-center rounded-full bg-brand text-lg font-extrabold"
          >
            Nazad na plan
          </Link>
        )
      ) : (
        <Button
          block
          disabled={renew.isPending}
          onClick={() => void proceed()}
          className="mt-6 min-h-[56px] text-lg font-extrabold"
        >
          {renew.isPending ? 'Pravim novi program…' : 'Nastavi program'}
        </Button>
      )}
      {phase === 'expired' && (
        <p role="status" className="mt-4 text-muted">
          Pristup planu je istekao. Izveštaj i ponuda za nastavak ostaju dostupni.
        </p>
      )}

      <Button variant="soft" className="mt-8" onClick={() => signOut.mutate()}>
        Odjavi se
      </Button>
    </Screen>
  )
}
