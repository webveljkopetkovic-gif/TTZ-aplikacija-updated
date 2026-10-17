import type { ChatMessage } from '@/api/assistant'

export type ReviewStatus = { who: 'olgica' | 'ognjen' | 'team'; text: string }

/** Oznaka ispod odgovora asistenta: ko treba da potvrdi predlog i da li je potvrdio. */
export function reviewStatus(m: ChatMessage): ReviewStatus | null {
  const action = m.proposed_action
  if (!m.needs_team_review || !action) return null
  const result = m.review_result
  if (action.type === 'meal_swap') {
    if (!result) return { who: 'olgica', text: 'Čeka potvrdu Olgice' }
    return {
      who: 'olgica',
      text: result === 'rejected' ? 'Olgica nije odobrila zamenu' : 'Olgica je potvrdila',
    }
  }
  if (action.type === 'workout_swap') {
    if (!result) return { who: 'ognjen', text: 'Čeka potvrdu Ognjena' }
    return {
      who: 'ognjen',
      text: result === 'rejected' ? 'Ognjen nije odobrio zamenu' : 'Ognjen je potvrdio',
    }
  }
  return { who: 'team', text: result ? 'Tim je pročitao' : 'Prosleđeno timu' }
}
