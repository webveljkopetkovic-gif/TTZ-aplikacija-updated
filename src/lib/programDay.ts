/**
 * Jedini izvor istine za dane programa (CLAUDE.md, PLAN.md 4.2).
 * Sve se računa po Europe/Belgrade. Datumi su stringovi 'YYYY-MM-DD' (kao `programs.activated_at`),
 * a razlika dana ide preko UTC ponoći da letnje/zimsko vreme ne utiče na rezultat.
 * Iste formule postoje u SQL-u: program_day, plan_day, plan_cycle (0001_init.sql).
 */

export const TIMEZONE = 'Europe/Belgrade'
export const PLAN_LENGTH_DAYS = 14
export const FEEDBACK_EVERY_DAYS = 10
export const DEFAULT_DURATION_DAYS = 30

/** Datum ('YYYY-MM-DD') ili trenutak. Trenutak se pretvara u datum po Beogradu. */
export type DateInput = string | Date

const dateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Današnji (ili zadati) datum po Beogradu kao 'YYYY-MM-DD'. */
export function belgradeDate(now: Date = new Date()): string {
  return dateFormat.format(now)
}

function toIsoDate(input: DateInput): string {
  return typeof input === 'string' ? input : belgradeDate(input)
}

/** Broj dana od epohe za kalendarski datum (bez uticaja vremenske zone). */
function dayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

/** ISO dan u nedelji: 1 = ponedeljak … 7 = nedelja. */
export function isoWeekday(date: DateInput): number {
  const dow = new Date(dayNumber(toIsoDate(date)) * 86_400_000).getUTCDay()
  return dow === 0 ? 7 : dow
}

/** Dan programa: 0 dok nije aktiviran, inače (danas − activated_at) + 1. */
export function programDay(
  activatedAt: string | null | undefined,
  today: DateInput = new Date(),
): number {
  if (!activatedAt) return 0
  const day = dayNumber(toIsoDate(today)) - dayNumber(activatedAt) + 1
  return day > 0 ? day : 0
}

/** Dan u 14-dnevnom planu ishrane (1–14), 0 pre Dana 1. */
export function planDay(day: number): number {
  return day < 1 ? 0 : ((day - 1) % PLAN_LENGTH_DAYS) + 1
}

/** Krug plana ishrane (1 = dani 1–14, 2 = dani 15–28, 3 = od dana 29), 0 pre Dana 1. */
export function planCycle(day: number): number {
  return day < 1 ? 0 : Math.floor((day - 1) / PLAN_LENGTH_DAYS) + 1
}

/** Feedback je na dane 10, 20, 30 (višekratnici 10 unutar trajanja programa). */
export function isFeedbackDay(day: number, duration = DEFAULT_DURATION_DAYS): boolean {
  return day > 0 && day % FEEDBACK_EVERY_DAYS === 0 && day <= duration
}

/**
 * Najbliži dan feedbacka koji još nije prošao. Ako je danas dan feedbacka, vraća današnji dan.
 * Pre Dana 1 vraća 10. Null kad nema više feedbacka u programu.
 */
export function nextFeedbackDay(day: number, duration = DEFAULT_DURATION_DAYS): number | null {
  const next = Math.ceil(Math.max(day, 1) / FEEDBACK_EVERY_DAYS) * FEEDBACK_EVERY_DAYS
  return next <= duration ? next : null
}

/** Da li je datum dan treninga (ISO dani u nedelji iz `programs.training_weekdays`). */
export function isTrainingDay(date: DateInput, weekdays: readonly number[]): boolean {
  return weekdays.includes(isoWeekday(date))
}

/** Koliko je dana ostalo do kraja programa (0 na poslednji dan i posle njega). */
export function daysLeft(day: number, duration = DEFAULT_DURATION_DAYS): number {
  return Math.max(0, duration - Math.max(day, 0))
}

/** Kalendarski datum ('YYYY-MM-DD') za dan programa: dan 1 = activated_at. */
export function dateOfProgramDay(activatedAt: string, day: number): string {
  const d = new Date((dayNumber(activatedAt) + day - 1) * 86_400_000)
  return d.toISOString().slice(0, 10)
}
