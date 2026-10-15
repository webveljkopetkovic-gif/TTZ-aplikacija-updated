import { Link } from 'react-router-dom'
import {
  useMealLogs,
  useMySupplements,
  useProgramMeals,
  useSupplementLogs,
  useToggleMeal,
  useToggleSupplement,
  useWorkoutsForLevel,
} from '@/api/client'
import { useMyFeedbacks } from '@/api/feedback'
import { CheckCircle, ErrorNote, Loading, Panel, Pill, Screen } from '@/components/client/ui'
import { AppSetup } from '@/components/client/AppSetup'
import { Avatar } from '@/components/ui'
import { useMyProgram } from '@/hooks/useMyProgram'
import { cn } from '@/lib/cn'
import { firstName } from '@/lib/labels'
import {
  hhmm,
  mealsForDay,
  nextMealSlot,
  SLOT_LABEL,
  trainingDaysBefore,
  workoutForDay,
} from '@/lib/planMeals'
import { isTrainingDay, nextFeedbackDay, PLAN_LENGTH_DAYS, programPhase } from '@/lib/programDay'

/** Početna (design/Početna.png): današnji obroci, suplementi, trening i tok programa. */
export default function Home() {
  const my = useMyProgram()
  const programId = my.program?.id
  const meals = useProgramMeals(programId)
  const mealLogs = useMealLogs(programId, my.day)
  const toggleMeal = useToggleMeal(programId, my.day)
  const supplements = useMySupplements(programId)
  const supplementLogs = useSupplementLogs(programId, my.day)
  const toggleSupplement = useToggleSupplement(programId, my.day)
  const workouts = useWorkoutsForLevel(my.withTraining ? my.program?.exercise_level : null)
  const feedbacks = useMyFeedbacks(programId)
  const openFeedback = (feedbacks.data ?? []).find(
    (f) => f.status === 'open' || f.status === 'late',
  )

  const today = mealsForDay(meals.data ?? [], my.planDay, my.cycle)
  const done = mealLogs.data ?? new Set<string>()
  const next = nextMealSlot(today, done)
  const takenSupplements = supplementLogs.data ?? new Set<string>()

  const trainingToday = my.withTraining && isTrainingDay(my.today, my.trainingWeekdays)
  const workout = trainingToday
    ? workoutForDay(
        workouts.data ?? [],
        my.day,
        trainingDaysBefore(my.day, my.program?.activated_at ?? null, my.trainingWeekdays),
      )
    : null

  const feedbackDay = nextFeedbackDay(my.day, my.duration)
  const toFeedback = feedbackDay === null ? null : feedbackDay - my.day
  const name = firstName(my.profile?.full_name)
  const phase = programPhase(my.day, my.duration)

  return (
    <Screen>
      <header className="flex items-center gap-4">
        <Avatar name={name || 'K'} tone="client" size="lg" />
        <div>
          <h1 className="text-3xl font-extrabold leading-tight">Zdravo, {name}!</h1>
          <p className="text-muted">
            Dan {my.day} od {my.duration}
            {my.program?.plan_focus ? ` · ${my.program.plan_focus.toLowerCase()}` : ''}
          </p>
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-4">
        {phase !== 'active' && (
          <Link
            to="/app/kraj"
            className="flex items-center gap-4 rounded-card-lg bg-ink p-5 text-white"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-extrabold">
                {my.day >= my.duration ? 'Program je završen' : 'Program se bliži kraju'}
              </span>
              <span className="block">Rezultati, izveštaj tima i nastavak</span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>
        )}
        {openFeedback && (
          <Link
            to={`/app/feedback/${openFeedback.due_day}`}
            className="flex items-center gap-4 rounded-card-lg bg-brand p-5 text-ink"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-extrabold">
                {openFeedback.status === 'late'
                  ? `Čekamo tvoj feedback za dan ${openFeedback.due_day}`
                  : `Feedback za dan ${openFeedback.due_day} je otvoren`}
              </span>
              <span className="block">Treba ti samo 2 minuta</span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>
        )}
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <Pill>Ishrana · Olgica</Pill>
            <Link to="/app/ishrana" className="font-bold text-brand-text underline">
              Ceo plan
            </Link>
          </div>
          <p className="mt-5 text-5xl font-extrabold">
            Dan {my.planDay}{' '}
            <span className="text-xl font-normal text-muted">
              od {PLAN_LENGTH_DAYS} · {my.cycle}. krug
            </span>
          </p>
          <div
            className="mt-3 flex gap-1.5"
            role="img"
            aria-label={`Dan ${my.planDay} od ${PLAN_LENGTH_DAYS}`}
          >
            {Array.from({ length: PLAN_LENGTH_DAYS }, (_, i) => (
              <span
                key={i}
                className={cn('h-2 flex-1 rounded-full', i < my.planDay ? 'bg-ink' : 'bg-line')}
              />
            ))}
          </div>

          {meals.isPending && <Loading />}
          {meals.isError && <ErrorNote>Obroci se nisu učitali. Osveži stranicu.</ErrorNote>}
          <ul className="mt-3">
            {today.map((m) => (
              <li key={m.slot} className="flex items-center gap-2">
                <CheckCircle
                  checked={done.has(m.slot)}
                  label={`${SLOT_LABEL[m.slot]}: ${m.title}`}
                  disabled={toggleMeal.isPending}
                  onChange={(checked) => toggleMeal.mutate({ slot: m.slot, done: checked })}
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 py-2',
                    next === m.slot ? 'font-extrabold' : 'text-muted',
                  )}
                >
                  {SLOT_LABEL[m.slot]} · {m.title.toLowerCase()}
                </span>
                <span
                  className={cn('font-bold', next === m.slot ? 'text-brand-text' : 'text-muted')}
                >
                  {hhmm(m.time_of_day)}
                </span>
              </li>
            ))}
            {meals.isSuccess && today.length === 0 && (
              <li className="py-3 text-muted">Za današnji dan još nema obroka u planu.</li>
            )}
          </ul>
          {toggleMeal.isError && <ErrorNote>Štikliranje nije sačuvano. Pokušaj ponovo.</ErrorNote>}
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Suplementi danas</h2>
            <Link to="/app/suplementi" className="font-bold text-brand-text underline">
              Protokol
            </Link>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {(supplements.data ?? []).map((s) => {
              const taken = takenSupplements.has(s.id)
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={taken}
                    onClick={() => toggleSupplement.mutate({ id: s.id, taken: !taken })}
                    className={cn(
                      'min-h-btn rounded-full px-5 font-bold',
                      taken ? 'bg-brand text-ink' : 'bg-line text-ink',
                    )}
                  >
                    {taken ? '✓ ' : ''}
                    {s.name} · {s.timing.replace(/^uz /, '')}
                  </button>
                </li>
              )
            })}
            {supplements.isSuccess && (supplements.data ?? []).length === 0 && (
              <li className="text-muted">Nema suplemenata u protokolu.</li>
            )}
          </ul>
        </Panel>

        {my.withTraining && (
          <Link to="/app/vezbe" className="flex items-center gap-4 rounded-card-lg bg-card p-5">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink text-white"
            >
              ▶
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-extrabold">
                {trainingToday ? `Trening danas · ${workout?.title ?? 'Ognjen'}` : 'Danas je odmor'}
              </span>
              <span className="block text-muted">
                {trainingToday && workout
                  ? `${workout.duration_min} min · Ognjen`
                  : 'Pogledaj sve Ognjenove vežbe'}
              </span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>
        )}

        <Link to="/app/tok" className="flex items-center gap-4 rounded-card-lg bg-card p-5">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-2xl"
          >
            ↔
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-extrabold">
              Tok programa · dan 1 do {my.duration}
            </span>
            <span className="block text-muted">
              {toFeedback === null
                ? 'Završni feedback je prošao'
                : toFeedback === 0
                  ? `Feedback na dan ${feedbackDay} je danas`
                  : `Sledeći feedback za ${toFeedback} ${toFeedback === 1 ? 'dan' : 'dana'}`}
            </span>
          </span>
          <span aria-hidden="true">›</span>
        </Link>
        <AppSetup />
      </div>
    </Screen>
  )
}
