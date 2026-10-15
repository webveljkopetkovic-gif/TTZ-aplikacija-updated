import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '@/api/functions'
import { useSession } from '@/api/auth'
import {
  useAddSupplement,
  useApplyTemplate,
  useClientLabFiles,
  useClientProfile,
  useClientProgram,
  useMealTemplates,
  useProgramMeals,
  usePublishPlan,
  useRemoveSupplement,
  useSaveMeal,
  useSupplements,
  useUpdateProgram,
} from '@/api/team'
import { MealEditor } from '@/components/team/MealEditor'
import { ErrorNote, Loading, OwnerTag, Page, Section } from '@/components/team/ui'
import { Button, ChoiceChip } from '@/components/ui'
import { cn } from '@/lib/cn'
import { dislikedWords } from '@/lib/dislikes'
import { trainingView, type IntakeRow } from '@/lib/dossierView'
import { findMealRuleViolation } from '@/lib/mealRules'
import { DISLIKED_FOOD_OPTIONS } from '@/lib/intakeSchema'
import { EXERCISE_LEVEL_LABEL, type ExerciseLevel } from '@/lib/labels'

const LEVELS: ExerciseLevel[] = ['beginner', 'intermediate', 'advanced']
const WEEKDAYS = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned']
const TIMINGS = [
  'ujutru na prazan stomak',
  'uz doručak',
  'uz ručak',
  'uz večeru',
  'uveče pred spavanje',
]

/** Tim – plan za klijenta (design/Tim – plan za klijenta.png): šablon, obroci, suplementi, vežbe, „Pošalji plan“. */
export default function TeamPlan() {
  const { id } = useParams()
  const session = useSession()
  const userId = session.data?.user.id
  const profile = useClientProfile(id)
  const program = useClientProgram(id)
  const programId = program.data?.id
  const templates = useMealTemplates()
  const meals = useProgramMeals(programId)
  const supplements = useSupplements(programId)
  const labs = useClientLabFiles(id)

  const applyTemplate = useApplyTemplate(programId, id)
  const saveMeal = useSaveMeal(programId, userId)
  const addSupplement = useAddSupplement(programId)
  const removeSupplement = useRemoveSupplement(programId)
  const updateProgram = useUpdateProgram(programId, id)
  const publish = usePublishPlan(id)

  const [templateId, setTemplateId] = useState('')
  const [suppName, setSuppName] = useState('')
  const [suppTiming, setSuppTiming] = useState(TIMINGS[1])
  const [focus, setFocus] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [published, setPublished] = useState(false)

  if (program.isPending || profile.isPending) {
    return (
      <Page>
        <Loading />
      </Page>
    )
  }
  const p = program.data
  if (!p || !profile.data) {
    return (
      <Page>
        <ErrorNote>Klijent nema program.</ErrorNote>
      </Page>
    )
  }

  const intake = p.intake_surveys as unknown as (IntakeRow & { submitted_at: string }) | null
  const answers = (intake?.answers ?? {}) as Record<string, unknown>
  const withTraining = p.products?.kind === 'nutrition_training'
  const training = trainingView(answers)
  const selectedTemplate = templateId || p.meal_template_id || ''
  const mealItems = meals.data ?? []
  const disliked = Array.isArray(answers.disliked_foods) ? (answers.disliked_foods as string[]) : []
  const words = dislikedWords(
    disliked,
    typeof answers.disliked_other === 'string' ? answers.disliked_other : '',
  )
  const dislikedLabels = disliked.map(
    (v) => DISLIKED_FOOD_OPTIONS.find((o) => o.value === v)?.label ?? v,
  )
  const allergies = answers.allergies === true ? String(answers.allergies_text ?? 'da') : null
  const canEdit = p.status === 'building_plan' || p.status === 'ready'
  const isReady = p.status !== 'building_plan'
  const level = (p.exercise_level ?? null) as ExerciseLevel | null

  const choose = async () => {
    setFormError(undefined)
    if (!selectedTemplate) return setFormError('Izaberi šablon ishrane')
    if (
      mealItems.length > 0 &&
      !window.confirm('Šablon zamenjuje sve obroke koje si već izmenila. Nastaviti?')
    )
      return
    try {
      await applyTemplate.mutateAsync(selectedTemplate)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Šablon nije primenjen')
    }
  }

  const send = async () => {
    setFormError(undefined)
    setPublished(false)
    try {
      await publish.mutateAsync(p.id)
      setPublished(true)
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Plan nije poslat. Pokušaj ponovo.')
    }
  }

  const toggleDay = (d: number) => {
    const days = p.training_weekdays ?? []
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort()
    if (next.length > 0) updateProgram.mutate({ training_weekdays: next })
  }

  const suppViolation = findMealRuleViolation(suppName)

  return (
    <Page>
      <Link
        to={`/tim/klijenti/${id}`}
        className="inline-flex min-h-btn items-center font-bold text-muted"
      >
        ← DOSIJE
      </Link>
      <h1 className="mt-1 text-3xl font-extrabold leading-tight">{profile.data.full_name}</h1>
      <p className="text-muted">
        {intake
          ? `Anketa popunjena ${new Date(intake.submitted_at).toLocaleDateString('sr-Latn-RS')}`
          : 'Bez ankete'}
        {p.paid_at ? ' · plaćeno' : ' · čeka uplatu'}
      </p>

      {!canEdit && (
        <ErrorNote>
          Plan se više ne pravi iz ovog ekrana (program je {p.status}). Izmene idu kroz feedback.
        </ErrorNote>
      )}

      <div className="mt-5 flex flex-col gap-5">
        <Section
          title="Iz ankete"
          right={
            <Link to={`/tim/klijenti/${id}`} className="font-bold text-brand-text underline">
              Ceo dosije
            </Link>
          }
        >
          <ul className="flex flex-wrap gap-2">
            {[
              answers.no_diagnoses ? 'Nema dijagnoza' : String(answers.diagnoses ?? ''),
              withTraining && training.answered
                ? `${EXERCISE_LEVEL_LABEL[training.suggested]} nivo (predlog)`
                : '',
              `${labs.data?.length ?? 0} nalaza`,
            ]
              .filter(Boolean)
              .map((chip) => (
                <li key={chip} className="rounded-full bg-line px-4 py-2 font-bold">
                  {chip}
                </li>
              ))}
          </ul>
          <div role="note" className="mt-4 rounded-card border border-line bg-bg p-4">
            <p className="font-extrabold">Pazi pri izradi obroka</p>
            <p>Alergije: {allergies ?? 'nema'}</p>
            <p>
              Ne voli: {dislikedLabels.join(', ') || '—'}
              {typeof answers.disliked_other === 'string' && answers.disliked_other
                ? `, ${answers.disliked_other}`
                : ''}
            </p>
          </div>
        </Section>

        <Section title="Plan ishrane" right={<OwnerTag who="olgica" />}>
          <label htmlFor="plan-focus" className="block text-sm font-semibold text-muted">
            Fokus plana (klijent ga vidi)
          </label>
          <input
            id="plan-focus"
            value={focus ?? p.plan_focus ?? ''}
            onChange={(e) => setFocus(e.target.value)}
            onBlur={() => {
              if (focus !== undefined && focus.trim() !== (p.plan_focus ?? ''))
                updateProgram.mutate({ plan_focus: focus.trim() || null })
            }}
            placeholder="Npr. Insulinska rezistencija"
            className="mt-1 min-h-[52px] w-full rounded-full border border-line bg-bg px-5"
          />

          <label htmlFor="template" className="mt-4 block text-sm font-semibold text-muted">
            Šablon ishrane
          </label>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row">
            <select
              id="template"
              value={selectedTemplate}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={!canEdit}
              className="min-h-[52px] flex-1 rounded-full border border-line bg-bg px-5 text-base font-bold"
            >
              <option value="">Izaberi šablon…</option>
              {(templates.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button
              variant="black"
              disabled={!canEdit || applyTemplate.isPending || !selectedTemplate}
              onClick={choose}
            >
              {applyTemplate.isPending
                ? 'Kopiram…'
                : mealItems.length > 0
                  ? 'Primeni ponovo'
                  : 'Primeni šablon'}
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted">Izmeni pojedinačne obroke posle izbora šablona.</p>

          {meals.isPending && <Loading />}
          {mealItems.length > 0 && (
            <div className="mt-5">
              <MealEditor items={mealItems} words={words} onSave={(m) => saveMeal.mutateAsync(m)} />
            </div>
          )}
        </Section>

        <Section title="Suplementi" right={<OwnerTag who="olgica" />}>
          <ul className="flex flex-wrap gap-2">
            {(supplements.data ?? []).map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-1 rounded-full bg-line py-1 pl-4 pr-1 font-bold"
              >
                {s.name} <span className="font-normal text-muted">· {s.timing}</span>
                <button
                  type="button"
                  aria-label={`Ukloni ${s.name}`}
                  disabled={!canEdit}
                  onClick={() => removeSupplement.mutate(s.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                >
                  ×
                </button>
              </li>
            ))}
            {(supplements.data ?? []).length === 0 && (
              <li className="text-muted">Nema suplemenata.</li>
            )}
          </ul>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              if (suppName.trim() === '' || suppViolation) return
              addSupplement.mutate(
                { name: suppName.trim(), timing: suppTiming },
                { onSuccess: () => setSuppName('') },
              )
            }}
          >
            <input
              aria-label="Naziv suplementa"
              value={suppName}
              onChange={(e) => setSuppName(e.target.value)}
              placeholder="+ Dodaj (npr. Vitamin D3)"
              disabled={!canEdit}
              className="min-h-[48px] flex-1 rounded-full border border-dashed border-muted bg-bg px-5"
            />
            <select
              aria-label="Kada se uzima"
              value={suppTiming}
              onChange={(e) => setSuppTiming(e.target.value)}
              disabled={!canEdit}
              className="min-h-[48px] rounded-full border border-line bg-bg px-4"
            >
              {TIMINGS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <Button
              type="submit"
              variant="soft"
              disabled={!canEdit || suppName.trim() === '' || !!suppViolation}
            >
              Dodaj
            </Button>
          </form>
          {suppViolation && (
            <ErrorNote>{suppViolation}. Suplement se upisuje samo po nazivu.</ErrorNote>
          )}
        </Section>

        {withTraining && (
          <Section title="Vežbe" right={<OwnerTag who="ognjen" />}>
            {training.flags.length > 0 && (
              <p role="note" className="mb-3 font-semibold text-danger">
                Bezbednosne oznake iz upitnika: {training.flags.join('; ')}.
              </p>
            )}
            <p className="text-sm text-muted">
              Nivo
              {training.answered
                ? ` · predlog iz upitnika: ${EXERCISE_LEVEL_LABEL[training.suggested]}`
                : ''}
            </p>
            <div role="radiogroup" aria-label="Nivo vežbi" className="mt-2 flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={level === l}
                  disabled={!canEdit}
                  onClick={() => updateProgram.mutate({ exercise_level: l })}
                  className={cn(
                    'min-h-btn rounded-full px-5 font-bold',
                    level === l ? 'bg-ink text-white' : 'bg-bg',
                  )}
                >
                  {EXERCISE_LEVEL_LABEL[l]}
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">Dani treninga</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAYS.map((label, i) => (
                <ChoiceChip
                  key={label}
                  selected={(p.training_weekdays ?? []).includes(i + 1)}
                  disabled={!canEdit}
                  onClick={() => toggleDay(i + 1)}
                >
                  {label}
                </ChoiceChip>
              ))}
            </div>
          </Section>
        )}

        {formError && <ErrorNote>{formError}</ErrorNote>}
        {published && (
          <p role="status" className="rounded-card bg-brand p-4 font-extrabold">
            Plan je poslat. Klijent dobija poruku na WhatsApp i email.
          </p>
        )}

        <Button
          block
          disabled={isReady || publish.isPending}
          onClick={send}
          className="min-h-[64px] text-lg font-extrabold"
        >
          {isReady ? 'Plan je poslat' : publish.isPending ? 'Šaljem…' : 'Pošalji plan'}
        </Button>
        {!isReady && (
          <p className="-mt-2 text-center text-sm text-muted">
            Rok za izradu plana je 7 dana od uplate. Klijent dobija poruku, a Dan 1 počinje kad
            otvori plan.
          </p>
        )}
      </div>
    </Page>
  )
}
