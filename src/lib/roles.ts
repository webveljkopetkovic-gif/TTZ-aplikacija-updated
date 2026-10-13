import type { Database } from './database.types'

export type UserRole = Database['public']['Enums']['user_role']

export const TEAM_ROLES: UserRole[] = ['nutritionist', 'trainer', 'admin']

/** Početni ekran po ulozi (PLAN.md sekcija 2 i 6). */
export function homeForRole(role: UserRole): string {
  switch (role) {
    case 'client':
      return '/app'
    case 'partner':
      return '/partner'
    default:
      return '/tim'
  }
}
