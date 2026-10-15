/**
 * Feedback na 10 dana (PLAN.md 4.4, verzija 1). Isti fajl koriste forma klijenta i tim (preko src/lib/feedbackSchema.ts).
 * Bez grama i kalorija: pitanja su o osećaju, varenju i vežbama; težina i struk su merenja, ne hrana.
 */
import { z } from 'zod'

export const FEEDBACK_SCHEMA_VERSION = 1

export const FOOD_TAGS = [
  { value: 'heartburn', label: 'Gorušica' },
  { value: 'bloating', label: 'Nadutost' },
  { value: 'hunger', label: 'Glad' },
  { value: 'nausea', label: 'Mučnina' },
  { value: 'feel_bad', label: 'Loše se osećam posle jela' },
  { value: 'all_ok', label: 'Sve OK' },
] as const

export const EXERCISE_TAGS = [
  { value: 'pain_knee', label: 'Bol u kolenu' },
  { value: 'pain_other', label: 'Drugi bol' },
  { value: 'too_hard', label: 'Preteško' },
  { value: 'too_easy', label: 'Prelako' },
  { value: 'all_ok', label: 'Sve OK' },
] as const

export const REPLY_CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
] as const

export type FoodTag = (typeof FOOD_TAGS)[number]['value']
export type ExerciseTag = (typeof EXERCISE_TAGS)[number]['value']
export type ReplyChannel = (typeof REPLY_CHANNELS)[number]['value']

export const FOOD_TAG_LABEL = Object.fromEntries(FOOD_TAGS.map((t) => [t.value, t.label])) as Record<
  FoodTag,
  string
>
export const EXERCISE_TAG_LABEL = Object.fromEntries(
  EXERCISE_TAGS.map((t) => [t.value, t.label]),
) as Record<ExerciseTag, string>

const scale = z
  .number({ error: 'Izaberi ocenu od 1 do 5' })
  .int()
  .min(1, 'Izaberi ocenu od 1 do 5')
  .max(5, 'Izaberi ocenu od 1 do 5')

const decimal = (label: string, min: number, max: number, unit: string) =>
  z
    .number({ error: `Upiši ${label}` })
    .min(min, `${label[0].toUpperCase()}${label.slice(1)} mora biti između ${min} i ${max} ${unit}`)
    .max(max, `${label[0].toUpperCase()}${label.slice(1)} mora biti između ${min} i ${max} ${unit}`)

const text = (max: number) => z.string().trim().max(max, `Najviše ${max} znakova`)

/** `withTraining`: plan sa vežbama traži i odgovor o vežbama. */
export function makeFeedbackSchema(opts: { withTraining: boolean }) {
  return z
    .object({
      general: scale,
      energy_am: scale,
      food_tags: z.array(z.enum(FOOD_TAGS.map((t) => t.value) as [FoodTag, ...FoodTag[]])).default([]),
      food_text: text(500).default(''),
      exercise_tags: z
        .array(z.enum(EXERCISE_TAGS.map((t) => t.value) as [ExerciseTag, ...ExerciseTag[]]))
        .default([]),
      exercise_text: text(500).default(''),
      challenges: text(1000).default(''),
      weight_kg: decimal('težinu', 35, 250, 'kg'),
      waist_cm: decimal('obim struka', 40, 200, 'cm').optional(),
      reply_channels: z
        .array(z.enum(['whatsapp', 'email']))
        .min(1, 'Izaberi bar jedan kanal za odgovor tima'),
    })
    .superRefine((v, ctx) => {
      if (v.food_tags.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['food_tags'], message: 'Izaberi bar jedan odgovor' })
      }
      if (v.food_tags.includes('all_ok') && v.food_tags.length > 1) {
        ctx.addIssue({ code: 'custom', path: ['food_tags'], message: '„Sve OK“ ne ide uz ostalo' })
      }
      if (opts.withTraining && v.exercise_tags.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['exercise_tags'], message: 'Izaberi bar jedan odgovor' })
      }
      if (v.exercise_tags.includes('all_ok') && v.exercise_tags.length > 1) {
        ctx.addIssue({ code: 'custom', path: ['exercise_tags'], message: '„Sve OK“ ne ide uz ostalo' })
      }
    })
}

export type FeedbackAnswers = z.infer<ReturnType<typeof makeFeedbackSchema>>

/** Odgovori kako se čuvaju u `feedbacks.answers` (bez kanala, oni idu u profil/odgovor). */
export type StoredAnswers = Omit<FeedbackAnswers, 'reply_channels'> & {
  reply_channels?: string[]
  version?: number
}

export type FeedbackTag = { label: string; tone: 'lime' | 'black' | 'gray' }

/** Tagovi za listu tima: hrana (zeleno), vežbe (crno), pad energije (belo/sivo). „Sve OK“ je sivo. */
export function feedbackTags(
  answers: Partial<StoredAnswers> | null | undefined,
  previous?: Partial<StoredAnswers> | null,
): FeedbackTag[] {
  if (!answers) return []
  const tags: FeedbackTag[] = []
  const food = (answers.food_tags ?? []) as FoodTag[]
  for (const t of food) {
    tags.push({ label: FOOD_TAG_LABEL[t] ?? t, tone: t === 'all_ok' ? 'gray' : 'lime' })
  }
  const training = (answers.exercise_tags ?? []) as ExerciseTag[]
  for (const t of training) {
    tags.push({ label: EXERCISE_TAG_LABEL[t] ?? t, tone: t === 'all_ok' ? 'gray' : 'black' })
  }
  if (
    typeof answers.energy_am === 'number' &&
    typeof previous?.energy_am === 'number' &&
    answers.energy_am < previous.energy_am
  ) {
    tags.push({ label: 'Energija ↓', tone: 'gray' })
  }
  return tags
}

/** Da li feedback traži pažnju tima (bol, pad energije ili loš osećaj). */
export function needsAttention(
  answers: Partial<StoredAnswers> | null | undefined,
  previous?: Partial<StoredAnswers> | null,
): boolean {
  if (!answers) return false
  const training = (answers.exercise_tags ?? []) as string[]
  if (training.some((t) => t.startsWith('pain'))) return true
  if (typeof answers.general === 'number' && answers.general <= 2) return true
  return (
    typeof answers.energy_am === 'number' &&
    typeof previous?.energy_am === 'number' &&
    answers.energy_am < previous.energy_am
  )
}
