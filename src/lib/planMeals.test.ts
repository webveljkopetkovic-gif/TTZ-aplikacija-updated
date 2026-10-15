import { describe, expect, it } from 'vitest'
import {
  calendarDays,
  mealsForDay,
  nextMealSlot,
  trainingDaysBefore,
  workoutForDay,
  type PlanMeal,
} from './planMeals'
import { dateOfProgramDay, planCycle, planDay } from './programDay'

const meal = (
  plan_day: number,
  slot: PlanMeal['slot'],
  title: string,
  valid_from_cycle = 1,
): PlanMeal => ({
  plan_day,
  slot,
  time_of_day: '08:00:00',
  title,
  valid_from_cycle,
})

const meals = [
  meal(6, 'lunch', 'Pileće belo sa brokolijem'),
  meal(6, 'dinner', 'Salata sa jajima'),
  meal(6, 'lunch', 'Ćuretina umesto piletine', 2),
  meal(7, 'lunch', 'Ribica'),
]

describe('obrok za dan (krug i izmene)', () => {
  it('u 1. krugu važi osnovni obrok', () => {
    expect(mealsForDay(meals, 6, 1).map((m) => m.title)).toEqual([
      'Pileće belo sa brokolijem',
      'Salata sa jajima',
    ])
  })

  it('izmena sa valid_from_cycle 2 važi od 2. kruga, a ostali obroci ostaju', () => {
    expect(mealsForDay(meals, 6, 2).map((m) => m.title)).toEqual([
      'Ćuretina umesto piletine',
      'Salata sa jajima',
    ])
    expect(mealsForDay(meals, 6, 3).map((m) => m.title)).toEqual([
      'Ćuretina umesto piletine',
      'Salata sa jajima',
    ])
  })

  it('obroci su po redosledu u danu, a drugi dani se ne mešaju', () => {
    const day = mealsForDay(
      [meal(1, 'dinner', 'V'), meal(1, 'breakfast', 'D'), meal(2, 'lunch', 'X')],
      1,
      1,
    )
    expect(day.map((m) => m.title)).toEqual(['D', 'V'])
  })

  it('dan 20 je plan dan 6 u 2. krugu, a dan 29 plan dan 1 u 3. krugu (PLAN.md 4.3)', () => {
    expect([planDay(20), planCycle(20)]).toEqual([6, 2])
    expect([planDay(29), planCycle(29)]).toEqual([1, 3])
    expect(mealsForDay(meals, planDay(20), planCycle(20))[0].title).toBe('Ćuretina umesto piletine')
  })

  it('sledeći obrok je prvi koji nije štikliran', () => {
    const day = mealsForDay(meals, 6, 1)
    expect(nextMealSlot(day, new Set())).toBe('lunch')
    expect(nextMealSlot(day, new Set(['lunch']))).toBe('dinner')
    expect(nextMealSlot(day, new Set(['lunch', 'dinner']))).toBeNull()
  })
})

describe('kalendar programa', () => {
  const days = calendarDays(30, 10, '2026-10-05', [1, 3, 5], true) // 5. okt 2026 je ponedeljak

  it('ima 30 dana, danas, prošle i feedback dane 10, 20, 30', () => {
    expect(days).toHaveLength(30)
    expect(days.filter((d) => d.isToday).map((d) => d.day)).toEqual([10])
    expect(days.filter((d) => d.isPast)).toHaveLength(9)
    expect(days.filter((d) => d.isFeedback).map((d) => d.day)).toEqual([10, 20, 30])
  })

  it('novi krug plana počinje na dane 15 i 29', () => {
    expect(days.filter((d) => d.isCycleStart).map((d) => d.day)).toEqual([15, 29])
  })

  it('trening pon, sre, pet: dan 1 (pon), 3 (sre), 5 (pet), 8 (pon)', () => {
    const training = days.filter((d) => d.isTraining).map((d) => d.day)
    expect(training.slice(0, 5)).toEqual([1, 3, 5, 8, 10])
  })

  it('bez vežbi nema tačaka treninga', () => {
    expect(calendarDays(30, 1, '2026-10-05', [1, 3, 5], false).some((d) => d.isTraining)).toBe(
      false,
    )
  })
})

describe('datum dana programa i video po redu', () => {
  it('dan 1 je activated_at, dan 30 je 29 dana kasnije, preko promene vremena', () => {
    expect(dateOfProgramDay('2026-10-05', 1)).toBe('2026-10-05')
    expect(dateOfProgramDay('2026-10-05', 30)).toBe('2026-11-03')
    expect(dateOfProgramDay('2026-10-20', 14)).toBe('2026-11-02')
  })

  it('treninzi kruže kroz videe nivoa', () => {
    const videos = ['a', 'b']
    expect(trainingDaysBefore(1, '2026-10-05', [1, 3, 5])).toBe(0)
    expect(trainingDaysBefore(4, '2026-10-05', [1, 3, 5])).toBe(2) // dani 1 i 3
    expect(workoutForDay(videos, 1, 0)).toBe('a')
    expect(workoutForDay(videos, 4, 2)).toBe('a')
    expect(workoutForDay([], 1, 0)).toBeNull()
  })
})
