/** Prikaz feedbacka klijentu i timu: koje stanje je glavno, rokovi i nazivi. Bez baze, pokriveno testovima. */

export type FeedbackStatus = 'scheduled' | 'open' | 'submitted' | 'late' | 'answered'

export type FeedbackLike = {
  id: string
  due_day: number
  status: FeedbackStatus | string
  submitted_at?: string | null
}

/** Koliko dana posle dana feedbacka odgovor tima ostaje glavna kartica. */
export const ANSWER_SPOTLIGHT_DAYS = 3

/** Rok tima za odgovor na feedback (CLAUDE.md): 48 h od slanja. */
export const REPLY_DEADLINE_HOURS = 48

const ORDINAL = ['PRVI', 'DRUGI', 'ZAVRŠNI']
const SUBTITLE = [
  'Izmene stižu u 2. krug plana',
  'Provera posle izmena',
  'Rezultati i plan za dalje',
]

/** „Dan 10 · prvi feedback“, „Dan 30 · završni“. Poslednji feedback programa je „završni“. */
export function feedbackTitle(dueDay: number, all: readonly { due_day: number }[]): string {
  const sorted = [...all].sort((a, b) => a.due_day - b.due_day)
  const i = Math.max(
    0,
    sorted.findIndex((f) => f.due_day === dueDay),
  )
  const last = i === sorted.length - 1 && sorted.length > 1
  const name = last ? 'završni' : i === 0 ? 'prvi feedback' : 'drugi feedback'
  return `Dan ${dueDay} · ${name}`
}

export function feedbackKicker(dueDay: number, all: readonly { due_day: number }[]): string {
  const sorted = [...all].sort((a, b) => a.due_day - b.due_day)
  const i = Math.max(
    0,
    sorted.findIndex((f) => f.due_day === dueDay),
  )
  const last = i === sorted.length - 1 && sorted.length > 1
  return `${last ? ORDINAL[2] : (ORDINAL[i] ?? ORDINAL[1])} FEEDBACK · DAN ${dueDay}`
}

export function feedbackBlurb(dueDay: number, all: readonly { due_day: number }[]): string {
  const sorted = [...all].sort((a, b) => a.due_day - b.due_day)
  const i = Math.max(
    0,
    sorted.findIndex((f) => f.due_day === dueDay),
  )
  const last = i === sorted.length - 1 && sorted.length > 1
  return last ? SUBTITLE[2] : (SUBTITLE[i] ?? SUBTITLE[1])
}

export type HeroState<T extends FeedbackLike = FeedbackLike> =
  | { kind: 'open'; feedback: T }
  | { kind: 'waiting'; feedback: T }
  | { kind: 'upcoming'; feedback: T; daysLeft: number }
  | { kind: 'answered'; feedback: T }
  | { kind: 'none' }

/**
 * Šta je glavno na ekranu Feedback: prvo ono što klijent treba da popuni (otvoren ili zakasneo), zatim poslat
 * feedback koji čeka odgovor, pa sledeći na redu, a na kraju poslednji odgovoren.
 */
export function heroState<T extends FeedbackLike>(
  feedbacks: readonly T[],
  day: number,
): HeroState<T> {
  const sorted = [...feedbacks].sort((a, b) => a.due_day - b.due_day)
  const open = sorted.find((f) => f.status === 'open' || f.status === 'late')
  if (open) return { kind: 'open', feedback: open }
  const waiting = [...sorted].reverse().find((f) => f.status === 'submitted')
  if (waiting) return { kind: 'waiting', feedback: waiting }
  const answered = [...sorted].reverse().find((f) => f.status === 'answered')
  // sveže odgovoren feedback ima prednost nad sledećim na redu, da klijent odmah vidi odgovor tima
  if (answered && day - answered.due_day <= ANSWER_SPOTLIGHT_DAYS) {
    return { kind: 'answered', feedback: answered }
  }
  const next = sorted.find((f) => f.status === 'scheduled')
  if (next) return { kind: 'upcoming', feedback: next, daysLeft: Math.max(0, next.due_day - day) }
  if (answered) return { kind: 'answered', feedback: answered }
  return { kind: 'none' }
}

/** Do kada tim odgovara (ISO), 48 h posle slanja. */
export function replyDeadline(submittedAt: string | null | undefined): Date | null {
  if (!submittedAt) return null
  return new Date(new Date(submittedAt).getTime() + REPLY_DEADLINE_HOURS * 3_600_000)
}

/** Preostalo vreme do roka tima, ili prekoračenje. */
export function replyCountdown(
  submittedAt: string | null | undefined,
  now: Date = new Date(),
): { overdue: boolean; hours: number } | null {
  const deadline = replyDeadline(submittedAt)
  if (!deadline) return null
  const diffH = (deadline.getTime() - now.getTime()) / 3_600_000
  return { overdue: diffH < 0, hours: Math.abs(Math.floor(diffH)) }
}

export const daysWord = (n: number) => (n === 1 ? 'dan' : 'dana')

/** Oznaka stanja u listi feedbacka. */
export function statusLabel(status: string, daysLeft: number): string {
  switch (status) {
    case 'open':
      return 'Otvoren'
    case 'late':
      return 'Kasni'
    case 'submitted':
      return 'Poslato'
    case 'answered':
      return 'Odgovoreno'
    default:
      return daysLeft <= 0 ? 'Danas' : `za ${daysLeft} ${daysWord(daysLeft)}`
  }
}

/** „danas“, „juče“ ili „pre N d“ po datumu u Europe/Belgrade. */
export function relativeDay(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return ''
  const day = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(d)
  const diff = Math.round(
    (Date.parse(`${day(now)}T00:00:00Z`) - Date.parse(`${day(new Date(iso))}T00:00:00Z`)) /
      86_400_000,
  )
  if (diff <= 0) return 'danas'
  if (diff === 1) return 'juče'
  return `pre ${diff} d`
}
