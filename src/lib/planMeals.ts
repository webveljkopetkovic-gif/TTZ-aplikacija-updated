/**
 * Plan ishrane klijenta (PLAN.md 4.3): obrok za dan = red za plan_day i slot sa najvećim
 * valid_from_cycle ≤ tekući krug. Dane računa samo src/lib/programDay.ts.
 */
import { dateOfProgramDay, isFeedbackDay, isTrainingDay, planCycle } from './programDay'

export type Slot = 'breakfast' | 'snack_am' | 'lunch' | 'snack_pm' | 'dinner'

export const SLOT_ORDER: readonly Slot[] = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner']

export const SLOT_LABEL: Record<Slot, string> = {
  breakfast: 'Doručak',
  snack_am: 'Užina',
  lunch: 'Ručak',
  snack_pm: 'Užina',
  dinner: 'Večera',
}

export interface PlanMeal {
  plan_day: number
  slot: Slot
  time_of_day: string
  title: string
  description?: string | null
  recipe?: string | null
  valid_from_cycle: number
}

/** Obroci za jedan dan plana (1–14) u datom krugu, po redosledu u danu. */
export function mealsForDay<T extends PlanMeal>(
  meals: readonly T[],
  planDayNumber: number,
  cycle: number,
): T[] {
  const best = new Map<Slot, T>()
  for (const meal of meals) {
    if (meal.plan_day !== planDayNumber || meal.valid_from_cycle > cycle) continue
    const current = best.get(meal.slot)
    if (!current || meal.valid_from_cycle > current.valid_from_cycle) best.set(meal.slot, meal)
  }
  return SLOT_ORDER.flatMap((slot) => {
    const meal = best.get(slot)
    return meal ? [meal] : []
  })
}

/** „08:00:00“ → „08:00“. */
export const hhmm = (time: string) => time.slice(0, 5)

/** Prvi obrok koji nije štikliran (pa je „sledeći“ u danu). */
export function nextMealSlot(meals: readonly PlanMeal[], done: ReadonlySet<string>): Slot | null {
  return meals.find((m) => !done.has(m.slot))?.slot ?? null
}

export interface CalendarDay {
  day: number
  isToday: boolean
  isPast: boolean
  isFeedback: boolean
  /** Početak novog kruga plana ishrane (dan 15, 29). */
  isCycleStart: boolean
  isTraining: boolean
}

/** Kalendar programa (dani 1–trajanje) za ekran Tok programa. */
export function calendarDays(
  duration: number,
  today: number,
  activatedAt: string | null,
  trainingWeekdays: readonly number[],
  withTraining: boolean,
): CalendarDay[] {
  return Array.from({ length: duration }, (_, i) => {
    const day = i + 1
    return {
      day,
      isToday: day === today,
      isPast: day < today,
      isFeedback: isFeedbackDay(day, duration),
      isCycleStart: day > 1 && planCycle(day) !== planCycle(day - 1),
      isTraining:
        withTraining &&
        !!activatedAt &&
        isTrainingDay(dateOfProgramDay(activatedAt, day), trainingWeekdays),
    }
  })
}

/** Redni broj treninga za dan: 3 treninga nedeljno kruže kroz videe nivoa. */
export function workoutForDay<T>(
  workouts: readonly T[],
  day: number,
  trainingDaysBefore: number,
): T | null {
  if (workouts.length === 0 || day < 1) return null
  return workouts[trainingDaysBefore % workouts.length]
}

/** Koliko je dana treninga bilo pre datog dana (za izbor videa po redu). */
export function trainingDaysBefore(
  day: number,
  activatedAt: string | null,
  trainingWeekdays: readonly number[],
): number {
  if (!activatedAt) return 0
  let count = 0
  for (let d = 1; d < day; d++) {
    if (isTrainingDay(dateOfProgramDay(activatedAt, d), trainingWeekdays)) count++
  }
  return count
}
