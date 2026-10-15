import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useLogWorkout, useWorkout, useWorkoutLogs, useWorkoutsForLevel } from '@/api/client'
import { ErrorNote, Loading, Panel, Pill, Screen, ScreenHeader } from '@/components/client/ui'
import { Button, Segmented } from '@/components/ui'
import { useMyProgram } from '@/hooks/useMyProgram'
import { EXERCISE_LEVEL_LABEL, type ExerciseLevel } from '@/lib/labels'
import { trainingDaysBefore, workoutForDay } from '@/lib/planMeals'
import { isTrainingDay } from '@/lib/programDay'

const LEVELS: ExerciseLevel[] = ['beginner', 'intermediate', 'advanced']

/** Vežbe (design/Vežbe.png): samo za plan sa vežbama. Nivo određuje Ognjen, ostale klijent može da pogleda. */
export function Workouts() {
  const my = useMyProgram()
  const own = (my.program?.exercise_level ?? 'beginner') as ExerciseLevel
  const [level, setLevel] = useState<ExerciseLevel>()
  const shown = level ?? own
  const workouts = useWorkoutsForLevel(shown)
  const logs = useWorkoutLogs(my.program?.id)

  if (!my.withTraining) return <Navigate to="/app/danas" replace />

  const list = workouts.data ?? []
  const doneIds = new Set((logs.data ?? []).map((l) => l.workout_id))
  const trainingToday = isTrainingDay(my.today, my.trainingWeekdays)
  const todays =
    shown === own && trainingToday
      ? workoutForDay(
          list,
          my.day,
          trainingDaysBefore(my.day, my.program?.activated_at ?? null, my.trainingWeekdays),
        )
      : null
  const nextId = list.find((w) => !doneIds.has(w.id))?.id

  return (
    <Screen>
      <ScreenHeader title="Vežbe" subtitle="Od Ognjena · snimljeno, pusti kad ti odgovara" />

      <div className="mt-5">
        <Segmented<ExerciseLevel>
          label="Nivo vežbi"
          value={shown}
          onChange={setLevel}
          options={LEVELS.map((l) => ({ value: l, label: EXERCISE_LEVEL_LABEL[l] }))}
        />
      </div>

      {todays && (
        <Panel className="mt-4 bg-line/60">
          <Pill tone="black">DANAS · DAN {my.day}</Pill>
          <Link
            to={`/app/vezbe/${todays.id}`}
            className="mt-4 flex items-center gap-4 rounded-card bg-bg p-5"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-2xl font-extrabold leading-snug">{todays.title}</span>
              <span className="block text-muted">
                {todays.duration_min} min{todays.description ? ` · ${todays.description}` : ''}
              </span>
            </span>
            <span
              aria-label="Pusti"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-xl"
            >
              ▶
            </span>
          </Link>
        </Panel>
      )}
      {!todays && shown === own && (
        <p className="mt-4 rounded-card-lg bg-card p-5 text-muted">
          {trainingToday
            ? 'Za ovaj nivo još nema snimljenih videa.'
            : 'Danas nije dan treninga. Pusti neki trening kad ti odgovara.'}
        </p>
      )}

      {workouts.isPending && <Loading />}
      {workouts.isError && <ErrorNote>Vežbe se nisu učitale.</ErrorNote>}
      <Panel className="mt-4 px-5 py-2">
        <ul>
          {list.map((w, i) => {
            const done = doneIds.has(w.id)
            return (
              <li key={w.id} className="border-b border-line last:border-0">
                <Link
                  to={`/app/vezbe/${w.id}`}
                  className="flex min-h-[80px] items-center gap-4 py-3"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold ${w.id === nextId ? 'bg-ink text-white' : 'bg-line'}`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-extrabold">{w.title}</span>
                    <span className="block text-muted">{w.duration_min} min</span>
                  </span>
                  <span
                    className={
                      done
                        ? 'font-extrabold text-brand-text'
                        : w.id === nextId
                          ? 'font-extrabold'
                          : 'text-muted'
                    }
                  >
                    {done ? 'Gotovo' : w.id === nextId ? 'Sledeće' : '—'}
                  </span>
                </Link>
              </li>
            )
          })}
          {workouts.isSuccess && list.length === 0 && (
            <li className="py-4 text-muted">Ognjen još snima ovaj nivo.</li>
          )}
        </ul>
      </Panel>

      <p className="mt-4 rounded-card-lg bg-line/60 p-5">
        Neka vežba ti ne prija? Pitaj u{' '}
        <Link to="/app/pitanja" className="font-bold text-brand-text underline">
          Pitanjima
        </Link>
        . Zamena važi kad je Ognjen potvrdi.
      </p>
    </Screen>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')
const clock = (seconds: number) => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`

/** Vežba u toku i vežbe završene (design/Vežba u toku.png, Vežbe završene.png): video, tajmer, workout_logs. */
export function WorkoutPlayer() {
  const { id } = useParams()
  const my = useMyProgram()
  const workout = useWorkout(id)
  const logs = useWorkoutLogs(my.program?.id)
  const log = useLogWorkout(my.program?.id)
  const [startedAt, setStartedAt] = useState<number>()
  const [seconds, setSeconds] = useState(0)
  const [finished, setFinished] = useState<number>()

  useEffect(() => {
    if (startedAt === undefined || finished !== undefined) return
    const timer = window.setInterval(
      () => setSeconds(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [startedAt, finished])

  if (!my.withTraining) return <Navigate to="/app/danas" replace />
  if (workout.isPending) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }
  const w = workout.data
  if (!w) return <Navigate to="/app/vezbe" replace />

  const finish = async () => {
    const minutes = Math.max(1, Math.round(seconds / 60))
    try {
      await log.mutateAsync({ workout_id: w.id, program_day: my.day, duration_min: minutes })
      setFinished(minutes)
    } catch {
      // greška se prikazuje ispod dugmeta
    }
  }

  if (finished !== undefined) {
    const total = (logs.data ?? []).length
    return (
      <Screen>
        <Pill>VEŽBE ZAVRŠENE</Pill>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight">
          Bravo! <span className="text-brand-text">{w.title}</span> je gotov.
        </h1>
        <p className="mt-3 text-lg text-muted">
          {finished} min · ukupno {total} {total === 1 ? 'trening' : 'treninga'} u programu.
        </p>
        <Link
          to="/app/vezbe"
          className="mt-8 flex min-h-[56px] items-center justify-center rounded-full bg-brand text-lg font-extrabold"
        >
          Nazad na vežbe
        </Link>
      </Screen>
    )
  }

  const running = startedAt !== undefined
  return (
    <Screen>
      <ScreenHeader title={w.title} subtitle={`${w.duration_min} min · Ognjen`} back="/app/vezbe" />
      {w.description && <p className="mt-3 text-lg">{w.description}</p>}

      <Panel className="mt-5 text-center">
        <p className="text-sm font-bold text-muted">Vreme</p>
        <p className="mt-1 text-6xl font-extrabold tabular-nums" role="timer" aria-live="off">
          {clock(seconds)}
        </p>
        <a
          href={w.video_url}
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex min-h-[56px] items-center justify-center gap-2 rounded-full bg-ink text-lg font-extrabold text-white"
        >
          ▶ Pusti video
        </a>
      </Panel>

      <div className="mt-5">
        {running ? (
          <Button
            block
            disabled={log.isPending}
            onClick={finish}
            className="min-h-[56px] text-lg font-extrabold"
          >
            {log.isPending ? 'Čuvam…' : 'Završeno'}
          </Button>
        ) : (
          <Button
            block
            onClick={() => setStartedAt(Date.now())}
            className="min-h-[56px] text-lg font-extrabold"
          >
            Počni trening
          </Button>
        )}
        {log.isError && <ErrorNote>Trening nije sačuvan. Pokušaj ponovo.</ErrorNote>}
      </div>
      <p className="mt-4 text-sm text-muted">
        Ako ti nešto ne prija ili boli, stani i pitaj u Pitanjima.
      </p>
    </Screen>
  )
}
