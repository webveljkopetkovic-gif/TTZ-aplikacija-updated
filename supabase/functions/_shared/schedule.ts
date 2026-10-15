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
