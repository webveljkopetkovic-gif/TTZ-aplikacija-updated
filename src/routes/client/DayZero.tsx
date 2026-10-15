import { useRef, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useProfile, useSession } from '@/api/auth'
import { useAddLabFile, useCurrentProgram, useLabFileCount } from '@/api/programs'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { countIntakeAnswers } from '@/lib/intakeDerived'
import { EXERCISE_LEVEL_LABEL, firstName, type ExerciseLevel } from '@/lib/labels'
import { belgradeDate } from '@/lib/programDay'
import { homeForStatus } from '@/lib/programHome'

type StepState = 'done' | 'current' | 'upcoming'

function Step({ state, title, detail }: { state: StepState; title: string; detail: string }) {
  return (
    <li className="flex items-start gap-4" aria-current={state === 'current' ? 'step' : undefined}>
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
          state === 'done' && 'bg-brand',
          state === 'current' && 'bg-ink',
          state === 'upcoming' && 'border-2 border-dashed border-muted/60',
        )}
      >
        {state === 'done' && (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12 5 5 9-10" />
          </svg>
        )}
        {state === 'current' && <span className="h-4 w-4 rounded-full bg-brand" />}
      </span>
      <span className={cn(state === 'upcoming' && 'text-muted')}>
        <span className="block text-lg font-extrabold leading-snug">{title}</span>
        <span className="block text-muted">{detail}</span>
        {state === 'done' && <span className="sr-only"> (završeno)</span>}
        {state === 'current' && <span className="sr-only"> (u toku)</span>}
      </span>
    </li>
  )
}

/** „Danas u 10:12“ ili „13. 10. u 10:12“ po Europe/Belgrade. */
function formatSubmitted(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  const time = new Intl.DateTimeFormat('sr-Latn-RS', {
    timeZone: 'Europe/Belgrade',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
  if (belgradeDate(date) === belgradeDate()) return `Danas u ${time}`
  const day = new Intl.DateTimeFormat('sr-Latn-RS', {
    timeZone: 'Europe/Belgrade',
    day: 'numeric',
    month: 'numeric',
  }).format(date)
  return `${day} u ${time}`
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-card-lg bg-card p-6">{children}</div>
}

/** Dan 0 · tim pravi plan (design/Dan 0 · tim pravi plan.png). */
export default function DayZero() {
  const session = useSession()
  const userId = session.data?.user.id
  const profile = useProfile(userId)
  const program = useCurrentProgram(userId)
  const labCount = useLabFileCount(userId)
  const addFile = useAddLabFile(userId)
  const fileInput = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState<string>()

  if (program.isPending)
    return (
      <p role="status" className="p-6 text-muted">
        Učitavanje…
      </p>
    )
  const current = program.data
  if (!current) return <Navigate to="/app" replace />
  if (current.status !== 'building_plan' && current.status !== 'ready') {
    return <Navigate to={homeForStatus(current.status)} replace />
  }

  const ready = current.status === 'ready'
  const withTraining = current.products?.kind === 'nutrition_training'
  const level = current.exercise_level
    ? EXERCISE_LEVEL_LABEL[current.exercise_level as ExerciseLevel]
    : 'Početni'
  const intake = current.intake_surveys
  const answers = countIntakeAnswers(intake?.answers as Record<string, unknown> | undefined)
  const name = firstName(profile.data?.full_name)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-8 pt-8">
      <p className="w-fit rounded-full bg-brand px-4 py-2 text-sm font-extrabold uppercase">
        {ready ? 'Plan je spreman' : 'Dan 0 · uplata primljena'}
      </p>

      <h1 className="mt-6 text-4xl font-extrabold leading-tight">
        Hvala, {name}.{' '}
        <span className="text-brand-text">
          {ready ? 'Plan je spreman.' : 'Tim pravi tvoj plan.'}
        </span>
      </h1>
      <p className="mt-3 text-lg text-muted">
        {ready
          ? 'Dan 1 počinje kad otvoriš plan, pa ga otvori kad ti odgovara.'
          : `${withTraining ? 'Olgica i Ognjen pregledaju' : 'Olgica pregleda'} anketu i nalaze. Plan stiže najkasnije za 7 dana, javljamo ti na WhatsApp i email čim bude spreman.`}
      </p>

      <div className="mt-6">
        <Card>
          <ol className="flex flex-col gap-5">
            <Step
              state="done"
              title="Anketa poslata"
              detail={`${formatSubmitted(intake?.submitted_at)} · ${answers} odgovora`}
            />
            <Step
              state="done"
              title="Uplata primljena"
              detail={`${current.products?.name ?? 'Plan'} · ${current.duration_days} dana`}
            />
            <Step
              state={ready ? 'done' : 'current'}
              title="Olgica pravi plan ishrane"
              detail={`14 dana, suplementi i pregled nalaza${ready ? '' : ' · u toku'}`}
            />
            {withTraining && (
              <Step
                state={ready ? 'done' : 'upcoming'}
                title="Ognjen bira vežbe"
                detail={`${level} nivo, po tvojoj anketi`}
              />
            )}
            <Step
              state={ready ? 'current' : 'upcoming'}
              title="Plan stiže, kreće dan 1"
              detail="Dan 1 je dan kad otvoriš plan"
            />
          </ol>
        </Card>
      </div>

      <div className="mt-4 flex items-center gap-4 rounded-card-lg bg-card p-5">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-line"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 3h8l4 4v14H6z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold leading-snug">Dok čekaš, dodaj nalaze</p>
          <p className="text-muted">PDF ili slika · {labCount.data ?? 0} dodata</p>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic"
          className="sr-only"
          tabIndex={-1}
          data-testid="day-zero-file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setFileError(undefined)
            addFile.mutate(file, {
              onError: (error) =>
                setFileError(error instanceof Error ? error.message : 'Slanje nije uspelo'),
            })
          }}
        />
        <Button
          variant="black"
          disabled={addFile.isPending}
          onClick={() => fileInput.current?.click()}
        >
          {addFile.isPending ? 'Šalje se…' : 'Dodaj'}
        </Button>
      </div>
      {fileError && (
        <p role="alert" className="mt-2 text-sm font-semibold text-danger">
          {fileError}
        </p>
      )}

      <div className="mt-auto pt-8">
        {ready ? (
          <Link
            to="/app/dan-1"
            className="flex min-h-[56px] w-full items-center justify-center rounded-full bg-brand px-6 text-lg font-extrabold"
          >
            Plan je stigao · kreni sa danom 1
          </Link>
        ) : (
          <p role="status" className="text-center text-muted">
            Javljamo ti čim plan bude spreman.
          </p>
        )}
      </div>
    </main>
  )
}
