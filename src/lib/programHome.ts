import type { Database } from './database.types'

type Status = Database['public']['Enums']['program_status']

/** Početni ekran klijenta po statusu programa (PLAN.md 4.1 i 6). */
export function homeForStatus(status: Status): string {
  switch (status) {
    case 'awaiting_payment':
      return '/app/uplata'
    case 'building_plan':
      return '/app/priprema'
    case 'ready':
      return '/app/dan-1'
    case 'active':
      return '/app/danas'
    default:
      return '/app/kraj'
  }
}
