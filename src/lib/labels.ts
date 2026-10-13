export type ExerciseLevel = 'beginner' | 'intermediate' | 'advanced'

export const EXERCISE_LEVEL_LABEL: Record<ExerciseLevel, string> = {
  beginner: 'Početni',
  intermediate: 'Srednji',
  advanced: 'Napredni',
}

/** Ime bez prezimena za pozdrav: „Ana Marković“ → „Ana“. */
export const firstName = (fullName: string | null | undefined): string =>
  fullName?.trim().split(/\s+/)[0] ?? ''
