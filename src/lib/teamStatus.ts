/** Statusi klijenta kod tima (PLAN.md 4.8), izvedeni u SQL view-u team_client_overview. */

export type TeamStatus =
  | 'awaiting_payment'
  | 'new_plan'
  | 'ready'
  | 'active'
  | 'feedback_in'
  | 'late'
  | 'ending'
  | 'renewed'
  | 'ended'
  | 'cancelled'

export type StatusTone = 'lime' | 'black' | 'danger' | 'gray'

export const TEAM_STATUS: Record<TeamStatus, { label: string; tone: StatusTone }> = {
  awaiting_payment: { label: 'ČEKA UPLATU', tone: 'gray' },
  new_plan: { label: 'NOV PLAN', tone: 'black' },
  ready: { label: 'PLAN POSLAT', tone: 'gray' },
  active: { label: 'AKTIVAN', tone: 'gray' },
  feedback_in: { label: 'FEEDBACK', tone: 'lime' },
  late: { label: 'KASNI', tone: 'danger' },
  ending: { label: 'PRED KRAJ', tone: 'gray' },
  renewed: { label: 'PRODUŽIO', tone: 'gray' },
  ended: { label: 'ZAVRŠIO', tone: 'gray' },
  cancelled: { label: 'OTKAZAN', tone: 'gray' },
}

export function statusOf(value: string | null | undefined) {
  return TEAM_STATUS[(value ?? 'active') as TeamStatus] ?? TEAM_STATUS.active
}

export type TeamView = 'olgica' | 'ognjen' | 'all'

export interface OverviewLike {
  team_status: string | null
  product_kind: string | null
  pending_review_count?: number | null
}

/** Olgica vidi sve klijente (svi imaju ishranu), Ognjen samo one sa vežbama. */
export function forView<T extends OverviewLike>(rows: T[], view: TeamView): T[] {
  return view === 'ognjen' ? rows.filter((r) => r.product_kind === 'nutrition_training') : rows
}

export interface OverviewCounts {
  feedback: number
  late: number
  newPlans: number
  pendingReview: number
}

export function countOverview(rows: OverviewLike[]): OverviewCounts {
  return {
    feedback: rows.filter((r) => r.team_status === 'feedback_in').length,
    late: rows.filter((r) => r.team_status === 'late').length,
    newPlans: rows.filter((r) => r.team_status === 'new_plan').length,
    pendingReview: rows.reduce((sum, r) => sum + (r.pending_review_count ?? 0), 0),
  }
}

/** Podrazumevani prekidač po ulozi: Olgica, Ognjen, a admin vidi ceo tim. */
export function defaultView(role: string | undefined): TeamView {
  if (role === 'nutritionist') return 'olgica'
  if (role === 'trainer') return 'ognjen'
  return 'all'
}

/** Pozdrav po dobu dana u Europe/Belgrade. */
export function greeting(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Belgrade',
      hour: '2-digit',
      hour12: false,
    }).format(now),
  )
  if (hour < 10) return 'Dobro jutro'
  if (hour < 18) return 'Dobar dan'
  return 'Dobro veče'
}
