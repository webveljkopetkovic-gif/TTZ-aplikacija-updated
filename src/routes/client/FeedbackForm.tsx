import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '@/api/functions'
import { useMyMeasurements } from '@/api/client'
import { useMyFeedbacks, useSubmitFeedback, type FeedbackRecord } from '@/api/feedback'
import { AnswerList, Scale } from '@/components/client/feedbackParts'
import { ErrorNote, Loading, Panel, Pill, Screen } from '@/components/client/ui'
import { FieldError } from '@/components/form'
import { Button, ChoiceChip } from '@/components/ui'
import { useMyProgram } from '@/hooks/useMyProgram'
import {
  EXERCISE_TAGS,
  FOOD_TAGS,
  makeFeedbackSchema,
  type ExerciseTag,
  type FoodTag,
} from '@/lib/feedbackSchema'
import { feedbackTitle, replyDeadline } from '@/lib/feedbackView'
import { parseDecimal } from '@/lib/intakeSchema'

type Channel = 'whatsapp' | 'email'
const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
]

const textarea =
  'mt-2 w-full resize-none rounded-[22px] border border-line bg-card px-5 py-4 text-base placeholder:text-muted'
const numberInput =
  'mt-2 min-h-[52px] w-full rounded-full border border-line bg-card px-5 text-lg font-bold'

/** Izbor „Sve OK“ briše ostalo, a izbor nečeg drugog skida „Sve OK“. */
function toggleTag<T extends string>(current: T[], tag: T): T[] {
  if (tag === ('all_ok' as T)) return current.includes(tag) ? [] : [tag]
  const without = current.filter((t) => t !== ('all_ok' as T))
  return without.includes(tag) ? without.filter((t) => t !== tag) : [...without, tag]
}

function TagGroup<T extends string>({
  label,
  badge,
  badgeTone,
  tags,
  value,
  onChange,
  error,
}: {
  label: string
  badge: string
  badgeTone: 'lime' | 'black'
  tags: readonly { value: T; label: string }[]
  value: T[]
  onChange: (v: T[]) => void
  error?: string
}) {
  return (
    <fieldset>
      <legend className="flex flex-wrap items-center gap-3 text-lg font-bold">
        <Pill tone={badgeTone}>{badge}</Pill>
        {label}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((t) => (
          <ChoiceChip
            key={t.value}
            selected={value.includes(t.value)}
            onClick={() => onChange(toggleTag(value, t.value))}
            className="min-h-[48px] text-base"
          >
            {t.label}
          </ChoiceChip>
        ))}
      </div>
      <FieldError id={`${label}-error`} message={error} />
    </fieldset>
  )
}

function SentView({ feedback, all }: { feedback: FeedbackRecord; all: FeedbackRecord[] }) {
  const deadline = replyDeadline(feedback.submitted_at)
  return (
    <Screen>
      <Link to="/app/feedback" className="font-bold text-brand-text underline">
        ← Feedback
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold">{feedbackTitle(feedback.due_day, all)}</h1>
      {feedback.feedback_replies.length === 0 && (
        <p className="mt-2 text-muted">
          Poslato.{' '}
          {deadline &&
            `Tim odgovara porukom do ${new Intl.DateTimeFormat('sr-Latn', {
              timeZone: 'Europe/Belgrade',
              day: 'numeric',
              month: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }).format(deadline)}.`}
        </p>
      )}
      {feedback.feedback_replies.map((r) => (
        <Panel key={r.id} className="mt-5 bg-brand/30">
          <Pill>ODGOVOR TIMA</Pill>
          <p className="mt-3 whitespace-pre-line text-lg">{r.body}</p>
        </Panel>
      ))}
      <Panel className="mt-5">
        <h2 className="mb-1 text-lg font-extrabold">Tvoji odgovori</h2>
        {feedback.answers && <AnswerList answers={feedback.answers} />}
      </Panel>
    </Screen>
  )
}

/** Feedback forma (design/Feedback forma (dan 10).png). Slanje ide kroz Edge Function submit-feedback. */
export default function FeedbackForm() {
  const { day } = useParams()
  const navigate = useNavigate()
  const my = useMyProgram()
  const feedbacks = useMyFeedbacks(my.program?.id)
  const measurements = useMyMeasurements(my.program?.id)
  const submit = useSubmitFeedback(my.program?.id)

  const [general, setGeneral] = useState<number>()
  const [energy, setEnergy] = useState<number>()
  const [foodTags, setFoodTags] = useState<FoodTag[]>([])
  const [foodText, setFoodText] = useState('')
  const [exerciseTags, setExerciseTags] = useState<ExerciseTag[]>([])
  const [exerciseText, setExerciseText] = useState('')
  const [challenges, setChallenges] = useState('')
  const [weight, setWeight] = useState<string>()
  const [waist, setWaist] = useState('')
  const [channels, setChannels] = useState<Channel[]>(['whatsapp', 'email'])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string>()

  if (feedbacks.isPending || measurements.isPending || my.isPending) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }
  const list = feedbacks.data ?? []
  const feedback = list.find((f) => String(f.due_day) === day)
  if (!feedback) return <Navigate to="/app/feedback" replace />

  if (feedback.status === 'submitted' || feedback.status === 'answered') {
    return <SentView feedback={feedback} all={list} />
  }

  const closed = feedback.status === 'scheduled'
  // težina je unapred popunjena poslednjim merenjem
  const lastWeight = [...(measurements.data ?? [])].reverse().find((m) => m.weight_kg !== null)
  const weightValue =
    weight ?? (lastWeight?.weight_kg ? String(lastWeight.weight_kg).replace('.', ',') : '')

  const send = async () => {
    setServerError(undefined)
    const schema = makeFeedbackSchema({ withTraining: my.withTraining })
    const result = schema.safeParse({
      general,
      energy_am: energy,
      food_tags: foodTags,
      food_text: foodText,
      exercise_tags: my.withTraining ? exerciseTags : [],
      exercise_text: my.withTraining ? exerciseText : '',
      challenges,
      weight_kg: parseDecimal(weightValue),
      waist_cm: waist.trim() === '' ? undefined : parseDecimal(waist),
      reply_channels: channels,
    })
    if (!result.success) {
      const next: Record<string, string> = {}
      for (const issue of result.error.issues) next[String(issue.path[0])] ??= issue.message
      setErrors(next)
      return
    }
    setErrors({})
    try {
      await submit.mutateAsync({ feedback_id: feedback.id, answers: result.data })
      navigate('/app/feedback')
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields)
      setServerError(e instanceof ApiError ? e.message : 'Feedback nije poslat. Pokušaj ponovo.')
    }
  }

  return (
    <Screen className="pb-8">
      <header className="flex items-start gap-3">
        <Link
          to="/app/feedback"
          aria-label="Zatvori"
          className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-xl"
        >
          ×
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold leading-tight">
            Feedback · dan {feedback.due_day}
          </h1>
          <p className="text-muted">
            Na svakih 10 dana · Olgica{my.withTraining ? ' i Ognjen' : ''} čitaju
          </p>
        </div>
      </header>

      {closed && (
        <p role="status" className="mt-4 rounded-card bg-card p-4 font-semibold">
          Feedback se otvara na dan {feedback.due_day} u 09:00. Pitanja možeš da pogledaš unapred.
        </p>
      )}

      <form
        noValidate
        className="mt-6 flex flex-col gap-7"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Scale
            label="Kako se osećaš?"
            value={general}
            onChange={setGeneral}
            tone="green"
            error={errors.general}
          />
          <Scale
            label="Energija ujutru"
            value={energy}
            onChange={setEnergy}
            tone="black"
            error={errors.energy_am}
          />
        </div>

        <div>
          <TagGroup
            label="Da li ti neka hrana smeta?"
            badge="ISHRANA"
            badgeTone="lime"
            tags={FOOD_TAGS}
            value={foodTags}
            onChange={setFoodTags}
            error={errors.food_tags}
          />
          <label className="sr-only" htmlFor="food-text">
            Šta tačno smeta u ishrani
          </label>
          <textarea
            id="food-text"
            rows={2}
            maxLength={500}
            value={foodText}
            onChange={(e) => setFoodText(e.target.value)}
            placeholder="Npr. posle paradajza u salati za ručak"
            className={textarea}
          />
        </div>

        {my.withTraining && (
          <div>
            <TagGroup
              label="Neki problem sa vežbama?"
              badge="VEŽBE"
              badgeTone="black"
              tags={EXERCISE_TAGS}
              value={exerciseTags}
              onChange={setExerciseTags}
              error={errors.exercise_tags}
            />
            {exerciseTags.some((t) => t.startsWith('pain')) && (
              <>
                <label className="sr-only" htmlFor="exercise-text">
                  Gde boli
                </label>
                <textarea
                  id="exercise-text"
                  rows={2}
                  maxLength={500}
                  value={exerciseText}
                  onChange={(e) => setExerciseText(e.target.value)}
                  placeholder="Gde boli i kada?"
                  className={textarea}
                />
              </>
            )}
          </div>
        )}

        <div>
          <label htmlFor="challenges" className="block text-lg font-bold">
            Izazovi u poslednjih 10 dana
          </label>
          <textarea
            id="challenges"
            rows={3}
            maxLength={1000}
            value={challenges}
            onChange={(e) => setChallenges(e.target.value)}
            placeholder="Šta ti je bilo teško ili šta bi menjala?"
            className={textarea}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="weight" className="block text-lg font-bold">
              Težina (kg)
            </label>
            <input
              id="weight"
              inputMode="decimal"
              value={weightValue}
              onChange={(e) => setWeight(e.target.value)}
              aria-invalid={errors.weight_kg ? true : undefined}
              className={numberInput}
            />
            <FieldError id="weight-error" message={errors.weight_kg} />
          </div>
          <div>
            <label htmlFor="waist" className="block text-lg font-bold">
              Obim struka (cm)
            </label>
            <input
              id="waist"
              inputMode="decimal"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              aria-invalid={errors.waist_cm ? true : undefined}
              placeholder="Nije obavezno"
              className={numberInput}
            />
            <FieldError id="waist-error" message={errors.waist_cm} />
          </div>
        </div>

        <fieldset>
          <legend className="text-lg font-bold">Odgovor tima želim na</legend>
          <div className="mt-3 flex gap-3">
            {CHANNELS.map((c) => (
              <ChoiceChip
                key={c.value}
                selected={channels.includes(c.value)}
                onClick={() =>
                  setChannels((cur) =>
                    cur.includes(c.value) ? cur.filter((x) => x !== c.value) : [...cur, c.value],
                  )
                }
                className="min-h-[52px] flex-1 justify-center text-base"
              >
                {c.label}
              </ChoiceChip>
            ))}
          </div>
          <FieldError id="channels-error" message={errors.reply_channels} />
        </fieldset>

        {serverError && <ErrorNote>{serverError}</ErrorNote>}
        <Button
          type="submit"
          block
          disabled={closed || submit.isPending}
          className="min-h-[56px] text-lg font-extrabold"
        >
          {submit.isPending ? 'Šaljem…' : 'Pošalji feedback'}
        </Button>
      </form>
    </Screen>
  )
}
