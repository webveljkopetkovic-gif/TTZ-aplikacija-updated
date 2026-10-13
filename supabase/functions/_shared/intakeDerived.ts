/** Izvedena polja iz ankete (docs/ANKETA.md sekcije 5 i 6). Bez zavisnosti osim intakeSchema. */
import {
  ACTIVITY_OPTIONS,
  ageFromBirthDate,
  DISLIKED_FOOD_OPTIONS,
  FLUID_OPTIONS,
  labelOf,
  OUTDOOR_OPTIONS,
  SLEEP_HOURS_OPTIONS,
  STOOL_OPTIONS,
  SYMPTOM_OPTIONS,
  WORK_EXPOSURE_OPTIONS,
  type IntakeAnswers,
} from './intakeSchema.ts'

export { ageFromBirthDate }

export type ExerciseLevel = 'beginner' | 'intermediate' | 'advanced'
export type ActivityLevel = (typeof ACTIVITY_OPTIONS)[number]['value']

/** Sedeći ili Lagan → početni, Umeren → srednji, Visok → napredni. Ognjen potvrđuje u izradi plana. */
export function exerciseLevelFromActivity(activity: ActivityLevel): ExerciseLevel {
  switch (activity) {
    case 'sedentary':
    case 'light':
      return 'beginner'
    case 'moderate':
      return 'intermediate'
    case 'high':
      return 'advanced'
  }
}

export interface SummaryRow {
  label: string
  value: string
}

const list = (parts: (string | undefined)[]) => parts.filter((p) => p && p !== '').join(', ')

/** Kratki pregled za zdravstveni dosije: 11 redova, kao na dizajnu. */
export function intakeSummary(answers: IntakeAnswers, today?: string): SummaryRow[] {
  const age = ageFromBirthDate(answers.birth_date, today)
  const symptoms = answers.symptoms
    .filter((s) => s !== 'other')
    .map((s) => labelOf(SYMPTOM_OPTIONS, s))
  const work = answers.work_exposure
    .map((w) => labelOf(WORK_EXPOSURE_OPTIONS, w))
    .filter((w) => w !== 'Ništa od navedenog')
  const disliked = answers.disliked_foods.map((f) => labelOf(DISLIKED_FOOD_OPTIONS, f))

  return [
    { label: 'Godine · posao', value: `${age ?? '?'} god · ${answers.occupation}` },
    { label: 'Dijagnoze', value: answers.no_diagnoses ? 'Nema dijagnoza' : answers.diagnoses },
    { label: 'Simptomi', value: list([...symptoms, answers.symptoms_other]) || '—' },
    { label: 'Alergije', value: answers.allergies ? (answers.allergies_text ?? '') : 'Nema' },
    { label: 'Terapija sada', value: answers.therapy_current || '—' },
    { label: 'Visina · start', value: `${answers.height_cm} cm · ${answers.weight_kg} kg` },
    { label: 'Aktivnost', value: labelOf(ACTIVITY_OPTIONS, answers.activity) },
    {
      label: 'San · stolica',
      value: `${labelOf(SLEEP_HOURS_OPTIONS, answers.sleep_hours)} · ${labelOf(STOOL_OPTIONS, answers.stool)}`,
    },
    {
      label: 'Tečnost · napolju',
      value: `${labelOf(FLUID_OPTIONS, answers.fluids)} · ${labelOf(OUTDOOR_OPTIONS, answers.outdoor_time)}`,
    },
    { label: 'Posao', value: list([...work, answers.work_other]) || '—' },
    { label: 'Ne voli', value: list([...disliked, answers.disliked_other]) || '—' },
  ]
}

/** Kolone iz intake_surveys koje su takođe odgovori na pitanja (email, telefon, ime, rođenje, posao, pol, visina, težina, država). */
const COLUMN_ANSWERS = 9

/** Broj odgovora iz ankete: odgovori u `answers` koji nisu prazni + pitanja iz kolona. */
export function countIntakeAnswers(answers: Record<string, unknown> | null | undefined): number {
  const answered = Object.values(answers ?? {}).filter(
    (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0),
  )
  return COLUMN_ANSWERS + answered.length
}
