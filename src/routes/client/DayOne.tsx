import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '@/api/functions'
import {
  saveStartSettings,
  uploadProgressPhoto,
  useActivateProgram,
  useMyChannels,
  useReminderSettings,
  useSaveMeasurement,
  type Reminders,
} from '@/api/client'
import { Panel } from '@/components/client/ui'
import { FieldError } from '@/components/form'
import { Button, ChoiceChip, Input, Toggle } from '@/components/ui'
import { useMyProgram } from '@/hooks/useMyProgram'
import { parseDecimal } from '@/lib/intakeSchema'
import type { Database } from '@/lib/database.types'
import { homeForStatus } from '@/lib/programHome'

type Channel = Database['public']['Enums']['msg_channel']

const WEEKDAYS = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned']
const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'app', label: 'Aplikacija' },
]

function StepNumber({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-lg font-extrabold text-white"
    >
      {n}
    </span>
  )
}

function PhotoPick({
  label,
  file,
  onPick,
}: {
  label: string
  file: File | null
  onPick: (f: File | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,.heic"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        data-testid={`photo-${label}`}
        onChange={(e) => {
          onPick(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-muted/50 bg-bg p-3 text-center font-extrabold"
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        {label}
        {file && (
          <span className="max-w-full truncate text-sm font-normal text-brand-text">
            {file.name}
          </span>
        )}
      </button>
    </>
  )
}

/** Dan 1 · prvi koraci (design/Dan 1 · prvi koraci.png): mere, slike, podsetnici, pa activate-program. */
export default function DayOne() {
  const navigate = useNavigate()
  const my = useMyProgram()
  const reminderSettings = useReminderSettings(my.userId)
  const savedChannels = useMyChannels(my.userId)
  const saveMeasurement = useSaveMeasurement(my.program?.id)
  const activate = useActivateProgram()

  const [weight, setWeight] = useState<string>()
  const [waist, setWaist] = useState('')
  const [front, setFront] = useState<File | null>(null)
  const [side, setSide] = useState<File | null>(null)
  const [reminders, setReminders] = useState<Reminders>()
  const [channels, setChannels] = useState<Channel[]>()
  const [errors, setErrors] = useState<{ weight?: string; waist?: string }>({})
  const [serverError, setServerError] = useState<string>()
  const [busy, setBusy] = useState(false)

  if (my.isPending || reminderSettings.isPending || savedChannels.isPending) {
    return (
      <p role="status" className="p-6 text-muted">
        Učitavanje…
      </p>
    )
  }
  const program = my.program
  if (!program) return <Navigate to="/app" replace />
  if (program.status !== 'ready') return <Navigate to={homeForStatus(program.status)} replace />

  const weightValue = weight ?? String(program.intake_surveys?.start_weight_kg ?? '')
  const remindersValue = reminders ?? {
    meals: reminderSettings.data?.meals ?? true,
    supplements: reminderSettings.data?.supplements ?? true,
    workouts: reminderSettings.data?.workouts ?? true,
  }
  const channelsValue =
    channels ??
    (savedChannels.data?.length ? savedChannels.data : (['whatsapp', 'email'] as Channel[]))
  const workoutTime = (reminderSettings.data?.workout_time ?? '18:00:00').slice(0, 5)
  const trainingDays = my.trainingWeekdays.map((d) => WEEKDAYS[d - 1]).join(', ')

  const submit = async () => {
    setServerError(undefined)
    const w = parseDecimal(weightValue)
    const next: typeof errors = {}
    if (!Number.isFinite(w) || w < 35 || w > 250)
      next.weight = 'Težina mora biti između 35 i 250 kg'
    const c = waist.trim() === '' ? null : parseDecimal(waist)
    if (c !== null && (!Number.isFinite(c) || c < 40 || c > 200))
      next.waist = 'Obim struka mora biti između 40 i 200 cm'
    setErrors(next)
    if (next.weight || next.waist) return

    setBusy(true)
    try {
      await saveStartSettings(my.userId!, remindersValue, channelsValue)
      await saveMeasurement.mutateAsync({ program_day: 1, weight_kg: w, waist_cm: c })
      if (front) await uploadProgressPhoto(my.userId!, program.id, 1, 'front', front)
      if (side) await uploadProgressPhoto(my.userId!, program.id, 1, 'side', side)
      await activate.mutateAsync(program.id)
      navigate('/app/danas', { replace: true })
    } catch (error) {
      setServerError(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Čuvanje nije uspelo. Pokušaj ponovo.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 pb-8 pt-6">
      <header className="flex items-start gap-3">
        <Link
          to="/app/priprema"
          aria-label="Nazad"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <p className="text-sm font-extrabold uppercase text-brand-text">Dan 1 od {my.duration}</p>
          <h1 className="text-4xl font-extrabold leading-tight">Krećemo!</h1>
        </div>
      </header>
      <p className="mt-3 text-lg text-muted">
        Tri koraka, oko 3 minuta. Posle toga samo pratiš plan i podsetnike.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <Panel>
          <div className="flex items-center gap-3">
            <StepNumber n={1} />
            <h2 className="flex-1 text-xl font-extrabold">Početne mere</h2>
            <span className="text-sm text-muted">za tvoj napredak</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Input
              label="Težina (kg)"
              required
              inputMode="decimal"
              value={weightValue}
              error={errors.weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            <Input
              label="Obim struka (cm)"
              inputMode="decimal"
              placeholder="npr. 86"
              value={waist}
              error={errors.waist}
              onChange={(e) => setWaist(e.target.value)}
            />
          </div>
          <p className="mt-3 text-sm text-muted">
            Meriš se samo na dan 1, 10, 20 i 30. Hranu ne meriš i kalorije ne brojiš.
          </p>
        </Panel>

        <Panel>
          <div className="flex items-center gap-3">
            <StepNumber n={2} />
            <h2 className="flex-1 text-xl font-extrabold">Početne slike</h2>
            <span className="text-sm text-muted">nije obavezno</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <PhotoPick label="Spreda" file={front} onPick={setFront} />
            <PhotoPick label="Sa strane" file={side} onPick={setSide} />
          </div>
          <p className="mt-3 text-sm text-muted">
            Slike vidi samo tvoj tim. Poredićeš ih na dan 30.
          </p>
        </Panel>

        <Panel>
          <div className="flex items-center gap-3">
            <StepNumber n={3} />
            <h2 className="text-xl font-extrabold">Podsetnici</h2>
          </div>
          <ul className="mt-2 divide-y divide-line">
            <li className="flex items-center justify-between gap-3 py-3">
              <span>
                <span className="block font-extrabold">Obroci</span>
                <span className="block text-muted">5 puta dnevno, po tvom planu</span>
              </span>
              <Toggle
                label="Podsetnici za obroke"
                checked={remindersValue.meals}
                onChange={(meals) => setReminders({ ...remindersValue, meals })}
              />
            </li>
            <li className="flex items-center justify-between gap-3 py-3">
              <span>
                <span className="block font-extrabold">Suplementi</span>
                <span className="block text-muted">Uz obroke, po protokolu</span>
              </span>
              <Toggle
                label="Podsetnici za suplemente"
                checked={remindersValue.supplements}
                onChange={(supplements) => setReminders({ ...remindersValue, supplements })}
              />
            </li>
            {my.withTraining && (
              <li className="flex items-center justify-between gap-3 py-3">
                <span>
                  <span className="block font-extrabold">Trening</span>
                  <span className="block text-muted">
                    {trainingDays} u {workoutTime}
                  </span>
                </span>
                <Toggle
                  label="Podsetnici za trening"
                  checked={remindersValue.workouts}
                  onChange={(workouts) => setReminders({ ...remindersValue, workouts })}
                />
              </li>
            )}
            <li className="flex items-center justify-between gap-3 py-3">
              <span>
                <span className="block font-extrabold">Feedback na 10 dana</span>
                <span className="block text-muted">Dan 10, 20 i 30 u 9:00 · uvek uključeno</span>
              </span>
              <span className="rounded-full bg-brand px-3 py-1 text-xs font-extrabold">UVEK</span>
            </li>
          </ul>
        </Panel>

        <div>
          <p className="font-bold text-muted">Gde da ti stižu podsetnici i odgovori tima?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <ChoiceChip
                key={c.value}
                selected={channelsValue.includes(c.value)}
                onClick={() =>
                  setChannels(
                    channelsValue.includes(c.value)
                      ? channelsValue.filter((x) => x !== c.value)
                      : [...channelsValue, c.value],
                  )
                }
              >
                {channelsValue.includes(c.value) ? '✓ ' : ''}
                {c.label}
              </ChoiceChip>
            ))}
          </div>
          <FieldError
            id="channels-error"
            message={channelsValue.length === 0 ? 'Izaberi bar jedan način' : undefined}
          />
        </div>

        {serverError && (
          <p
            role="alert"
            className="rounded-card border border-danger p-4 font-semibold text-danger"
          >
            {serverError}
          </p>
        )}
      </div>

      <div className="mt-auto pt-8">
        <Button
          block
          disabled={busy || channelsValue.length === 0}
          onClick={submit}
          className="min-h-[56px] text-lg font-extrabold"
        >
          {busy ? 'Čuvam…' : 'Sačuvaj i kreni sa danom 1'}
        </Button>
      </div>
    </main>
  )
}
