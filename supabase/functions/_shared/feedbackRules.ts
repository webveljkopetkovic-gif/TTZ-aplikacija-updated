/**
 * Pravila schedulera (PLAN.md 4.4 i 4.5), čista funkcija bez baze i bez sata: `now` se prosleđuje, pa se
 * dan 10 u 08:59 / 09:00 / +24 h / +48 h testira lažnim vremenom. Koristi je Edge Function `scheduler`.
 *
 * - dan feedbacka u 09:00 po Beogradu: 'scheduled' → 'open' + poruka feedback_due
 * - 24 h posle otvaranja, ako nije popunjen: jedan podsetnik (feedback_reminder)
 * - 48 h posle otvaranja, ako nije popunjen: status 'late'
 * - dan 28 (dva dana pre kraja) u 09:00: najava kraja programa (program_end)
 * - posle poslednjeg dana programa: status programa 'ended'
 */
import { addDays, belgradeToday } from './schedule.ts'

export const OPEN_HOUR = 9
export const HOUR_MS = 3_600_000
export const REMINDER_AFTER_HOURS = 24
export const LATE_AFTER_HOURS = 48
/** Najava kraja stiže na dan `duration − 2` (dan 28 od 30). */
export const ENDING_ANNOUNCE_DAYS_BEFORE = 2

/** UTC trenutak kada je u Beogradu `date` u `hour`:00 (računa pomak za taj datum, pa leto/zima ne smeta). */
export function belgradeInstant(date: string, hour: number = OPEN_HOUR): Date {
  const guess = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00Z`)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Belgrade',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(guess)
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value)
  const asLocal = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
  const offset = asLocal - guess.getTime()
  return new Date(guess.getTime() - offset)
}

export type FeedbackRow = {
  id: string
  program_id: string
  due_day: number
  due_date: string
  status: 'scheduled' | 'open' | 'submitted' | 'late' | 'answered'
  reminder_count: number
}

export type ProgramRow = {
  id: string
  status: string
  activated_at: string | null
  duration_days: number
}

export type FeedbackAction =
  | { type: 'open'; feedback_id: string; program_id: string; due_day: number }
  | { type: 'remind'; feedback_id: string; program_id: string; due_day: number }
  | { type: 'late'; feedback_id: string; program_id: string; due_day: number }

export type ProgramAction =
  | { type: 'announce_end'; program_id: string; end_day: number }
  | { type: 'end'; program_id: string }

/** Trenutak otvaranja feedbacka (09:00 na dan due_date). */
export const feedbackOpensAt = (dueDate: string): Date => belgradeInstant(dueDate, OPEN_HOUR)

/** Šta scheduler treba da uradi sa jednim feedbackom u trenutku `now`. Redosled: open → remind → late. */
export function feedbackActions(row: FeedbackRow, now: Date): FeedbackAction[] {
  const opensAt = feedbackOpensAt(row.due_date).getTime()
  const elapsedH = (now.getTime() - opensAt) / HOUR_MS
  const base = { feedback_id: row.id, program_id: row.program_id, due_day: row.due_day }
  const actions: FeedbackAction[] = []

  if (row.status === 'scheduled') {
    if (elapsedH < 0) return []
    actions.push({ type: 'open', ...base })
  } else if (row.status !== 'open') {
    return [] // submitted, late i answered se ne diraju
  }

  if (elapsedH >= LATE_AFTER_HOURS) {
    // zakasnela provera: nema smisla slati podsetnik posle isteka roka
    actions.push({ type: 'late', ...base })
  } else if (elapsedH >= REMINDER_AFTER_HOURS && row.reminder_count === 0) {
    actions.push({ type: 'remind', ...base })
  }
  return actions
}

/** Najava kraja (dan duration−2 u 09:00) i prelazak u 'ended' posle poslednjeg dana. Samo aktivni programi. */
export function programActions(program: ProgramRow, now: Date): ProgramAction[] {
  if (program.status !== 'active' || !program.activated_at) return []
  const endDay = program.duration_days
  const lastDate = addDays(program.activated_at, endDay - 1)

  if (belgradeToday(now) > lastDate) return [{ type: 'end', program_id: program.id }]

  const announceDay = endDay - ENDING_ANNOUNCE_DAYS_BEFORE
  const announceAt = belgradeInstant(addDays(program.activated_at, announceDay - 1), OPEN_HOUR)
  if (announceDay >= 1 && now.getTime() >= announceAt.getTime()) {
    return [{ type: 'announce_end', program_id: program.id, end_day: endDay }]
  }
  return []
}
