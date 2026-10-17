import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMealLogs, useProgramMeals } from '@/api/client'
import { ErrorNote, Loading, Panel, Screen, ScreenHeader } from '@/components/client/ui'
import { useMyProgram } from '@/hooks/useMyProgram'
import { cn } from '@/lib/cn'
import { hhmm, mealsForDay, nextMealSlot, SLOT_LABEL } from '@/lib/planMeals'
import { PLAN_LENGTH_DAYS } from '@/lib/programDay'

/** Plan ishrane 14 dana (design/Plan ishrane 14 dana.png): selektor dana, obroci, recept, zamena. */
export default function Meals() {
  const my = useMyProgram()
  const meals = useProgramMeals(my.program?.id)
  const [params] = useSearchParams()
  const [picked, setPicked] = useState<number>()
  const [recipeFor, setRecipeFor] = useState<string>()
  // ?dan=N dolazi iz Pitanja („Otvori plan za dan N“)
  const linked = Number(params.get('dan'))
  const selected =
    picked ?? (Number.isInteger(linked) && linked >= 1 && linked <= PLAN_LENGTH_DAYS ? linked : my.planDay)
  const isToday = selected === my.planDay
  const logs = useMealLogs(my.program?.id, my.day)

  const day = mealsForDay(meals.data ?? [], selected, my.cycle)
  const next = isToday ? nextMealSlot(day, logs.data ?? new Set()) : null

  return (
    <Screen>
      <ScreenHeader
        title="Plan ishrane"
        subtitle={`Dan ${selected} od ${PLAN_LENGTH_DAYS} · ${my.cycle}. krug · od Olgice`}
        right={
          <div className="flex gap-2">
            <Link
              to="/app/nabavka"
              className="flex min-h-btn items-center rounded-full bg-brand px-5 font-extrabold"
            >
              Nabavka
            </Link>
            <Link
              to="/app/suplementi"
              className="flex min-h-btn items-center rounded-full bg-card px-5 font-extrabold"
            >
              Suplementi
            </Link>
          </div>
        }
      />

      <div
        role="group"
        aria-label="Dan plana"
        className="-mx-6 mt-5 flex gap-2 overflow-x-auto px-6 pb-1"
      >
        {Array.from({ length: PLAN_LENGTH_DAYS }, (_, i) => i + 1).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={selected === d}
            aria-label={`Dan ${d}${d === my.planDay ? ' (danas)' : ''}`}
            onClick={() => setPicked(d)}
            className={cn(
              'flex min-h-[64px] min-w-[56px] flex-col items-center justify-center rounded-[22px] font-extrabold',
              selected === d ? 'bg-brand' : 'bg-card',
              d === my.planDay && selected !== d && 'border-2 border-chart',
            )}
          >
            <span className="text-xs font-bold">Dan</span>
            <span className="text-2xl">{d}</span>
          </button>
        ))}
      </div>

      <p className="mt-4 flex min-h-[52px] items-center gap-3 rounded-full bg-brand px-5 font-extrabold">
        <span aria-hidden="true">⊘</span> Bez brojanja kalorija i vaganja namirnica
      </p>

      {meals.isPending && <Loading />}
      {meals.isError && <ErrorNote>Plan se nije učitao. Osveži stranicu.</ErrorNote>}

      <ul className="mt-4 flex flex-col gap-3">
        {day.map((m) => {
          const open = recipeFor === m.slot
          const isNext = next === m.slot
          return (
            <li key={m.slot} className="rounded-card-lg bg-card p-5">
              <div className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-line text-sm text-muted"
                >
                  {SLOT_LABEL[m.slot].charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-extrabold',
                      isNext ? 'text-brand-text' : 'text-muted',
                    )}
                  >
                    {SLOT_LABEL[m.slot]} · {hhmm(m.time_of_day)}
                    {isNext ? ' · sledeći' : ''}
                  </p>
                  <p className="text-xl font-extrabold leading-snug">{m.title}</p>
                  {m.description && <p className="text-muted">{m.description}</p>}
                </div>
                {!isNext && (
                  <Link
                    to={`/app/pitanja?zamena=${m.slot}&dan=${selected}`}
                    aria-label={`Zameni obrok: ${m.title}`}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-line text-xl"
                  >
                    ⇄
                  </Link>
                )}
              </div>
              {isNext && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setRecipeFor(open ? undefined : m.slot)}
                    className="min-h-[52px] rounded-full border border-line bg-bg font-extrabold"
                  >
                    Recept
                  </button>
                  <Link
                    to={`/app/pitanja?zamena=${m.slot}&dan=${selected}`}
                    className="flex min-h-[52px] items-center justify-center rounded-full bg-line font-extrabold"
                  >
                    Zameni obrok
                  </Link>
                </div>
              )}
              {isNext && open && (
                <p className="mt-3 whitespace-pre-line rounded-2xl bg-bg p-4">
                  {m.recipe ?? 'Recept za ovaj obrok još nije dodat.'}
                </p>
              )}
            </li>
          )
        })}
        {meals.isSuccess && day.length === 0 && (
          <li className="rounded-card-lg bg-card p-5 text-muted">
            Za ovaj dan još nema obroka u planu.
          </li>
        )}
      </ul>

      <Panel className="mt-4 bg-line/60">
        <p>
          <span className="font-extrabold text-brand-text">Olgica:</span> zamena obroka važi tek kad
          je tim potvrdi. Posle 14. dana kreće {my.cycle + 1}. krug, sa izmenama iz tvog feedbacka.
        </p>
      </Panel>
    </Screen>
  )
}
