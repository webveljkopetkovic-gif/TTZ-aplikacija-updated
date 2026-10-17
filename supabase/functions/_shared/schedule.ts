/** Raspored feedbacka pri aktivaciji (PLAN.md 4.4). Bez zavisnosti, koristi ga Edge Function activate-program. */

export const FEEDBACK_EVERY_DAYS = 10

/** Današnji datum po Europe/Belgrade ('YYYY-MM-DD'). */
export function belgradeToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Belgrade',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Datum + broj dana (UTC aritmetika, pa promena vremena ne utiče). */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** Feedbacki za dane 10, 20, 30… do kraja programa; `due_date = activated_at + due_day − 1`. */
export function feedbackSchedule(
  activatedAt: string,
  durationDays: number,
): { due_day: number; due_date: string }[] {
  const out: { due_day: number; due_date: string }[] = []
  for (let day = FEEDBACK_EVERY_DAYS; day <= durationDays; day += FEEDBACK_EVERY_DAYS) {
    out.push({ due_day: day, due_date: addDays(activatedAt, day - 1) })
  }
  return out
}

/**
 * Dan programa na server strani: (danas − activated_at) + 1, 0 pre Dana 1. Isti rezultat kao
 * src/lib/programDay.ts (to proverava test u src/lib/schedule.test.ts).
 */
export function programDayOn(activatedAt: string | null, today: string = belgradeToday()): number {
  if (!activatedAt) return 0
  const toDays = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return Date.UTC(y, m - 1, d) / 86_400_000
  }
  const day = toDays(today) - toDays(activatedAt) + 1
  return day > 0 ? day : 0
}

/** Dan u 14-dnevnom planu ishrane i krug (isto kao planDay / planCycle u src/lib/programDay.ts). */
export function planDayOn(day: number): { planDay: number; cycle: number } {
  if (day < 1) return { planDay: 0, cycle: 0 }
  return { planDay: ((day - 1) % 14) + 1, cycle: Math.floor((day - 1) / 14) + 1 }
}
