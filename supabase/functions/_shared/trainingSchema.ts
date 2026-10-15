/**
 * Ognjenova pitanja za online trening (koraci 5–9 ankete, docs/ANKETA.md sekcija 3b). Opcije, polja po koracima,
 * BMI i predlog nivoa. Tekstovi pitanja su Ognjenovi. Deli se između forme i Edge Function `submit-intake`,
 * pa sme da importuje samo `zod` i intakeSchema. Visina i težina su u koraku 1 ankete.
 */
import { z } from 'zod'
import type { Option } from './intakeSchema.ts'

export const GOAL_OPTIONS = [
  { value: 'fat_loss', label: 'Gubitak telesne masti' },
  { value: 'muscle_gain', label: 'Povećanje mišićne mase' },
  { value: 'strength', label: 'Razvoj snage' },
  { value: 'fitness', label: 'Poboljšanje kondicije' },
  { value: 'health', label: 'Zdravlje, pokretljivost i opšta fizička spremnost' },
] as const

export const PLACE_OPTIONS = [
  { value: 'home', label: 'Kod kuće' },
  { value: 'gym', label: 'U teretani' },
] as const

export const YES_NO_UNSURE_OPTIONS = [
  { value: 'yes', label: 'Da' },
  { value: 'no', label: 'Ne' },
  { value: 'unsure', label: 'Nisam siguran/na' },
] as const

export const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Da' },
  { value: 'no', label: 'Ne' },
] as const

export const TRAIN_DURATION_OPTIONS = [
  { value: 'never', label: 'Nikada' },
  { value: 'lt3m', label: 'Manje od 3 meseca' },
  { value: '3_12m', label: '3–12 meseci' },
  { value: '1_3y', label: '1–3 godine' },
  { value: 'gt3y', label: 'Više od 3 godine' },
] as const

export const TRAIN_FREQUENCY_OPTIONS = [
  { value: 'none', label: 'Nisam trenirao/la' },
  { value: 'occasionally', label: 'Povremeno' },
  { value: '1_2', label: '1–2 puta nedeljno' },
  { value: '3_4', label: '3–4 puta nedeljno' },
  { value: '5plus', label: '5 ili više puta nedeljno' },
] as const

export const TECHNIQUE_OPTIONS = [
  { value: 'none', label: 'Ne poznajem' },
  { value: 'some', label: 'Poznajem neke, nisam siguran/na' },
  { value: 'most', label: 'Većinu izvodim samostalno' },
  { value: 'very_good', label: 'Veoma dobro poznajem' },
] as const

export const CHAIR_STAND_OPTIONS = [
  { value: 'lt10', label: 'Manje od 10' },
  { value: '10_19', label: '10–19' },
  { value: '20_29', label: '20–29' },
  { value: '30plus', label: '30 ili više' },
] as const

/** „cant“ je dodato uz Ognjenove opsege: bez njega početnik ne može da odgovori na sklekove sa stopala. */
export const PUSHUP_OPTIONS = [
  { value: 'lt5', label: '< 5' },
  { value: '5_10', label: '5–10' },
  { value: '10_15', label: '10–15' },
  { value: '15_20', label: '15–20' },
  { value: 'gt20', label: '> 20' },
  { value: 'cant', label: 'Ne mogu / nisam probao/la' },
] as const

export const PLANK_OPTIONS = [
  { value: 'lt20', label: 'Manje od 20 s' },
  { value: '20_44', label: '20–44 s' },
  { value: '45_89', label: '45–89 s' },
  { value: '90plus', label: '90 s ili više' },
  { value: 'unknown', label: 'Ne znam' },
] as const

export const SINGLE_LEG_OPTIONS = [
  { value: 'no', label: 'Ne' },
  { value: 'difficult', label: 'Da, uz teškoće' },
  { value: 'stable', label: 'Da, stabilno' },
  { value: 'not_tried', label: 'Nisam probao/la' },
] as const

export const MOVEMENT_PAIN_OPTIONS = [
  { value: 'yes', label: 'Da' },
  { value: 'sometimes', label: 'Ponekad' },
  { value: 'no', label: 'Ne' },
  { value: 'unsure', label: 'Nisam siguran/na' },
] as const

export const STAIRS_OPTIONS = [
  { value: 'must_stop', label: 'Moram da stanem' },
  { value: 'very_breathless', label: 'Značajno se zadišem' },
  { value: 'breathless', label: 'Umereno se zadišem' },
  { value: 'easy', label: 'Bez većih teškoća' },
] as const

export const CARDIO_OPTIONS = [
  { value: 'lt10', label: 'Manje od 10 min' },
  { value: '10_20', label: '10–20 min' },
  { value: '20_40', label: '20–40 min' },
  { value: 'gt40', label: 'Više od 40 min' },
] as const

export const RECOVERY_OPTIONS = [
  { value: 'gt3d', label: 'Više od 3 dana' },
  { value: '2_3d', label: '2–3 dana' },
  { value: '24_48h', label: '24–48 sati' },
  { value: 'no_experience', label: 'Nemam iskustva' },
] as const

export const HOME_EQUIPMENT: readonly string[] = [
  'Trake za razvlačenje',
  'Podesive bučice 10–20 kg',
  'Karabinjeri okačeni na zid na 3 visine',
  'Pilates lopta prečnika 45–55 cm',
  'Podpetica (može i knjiga ili obična daska)',
]

export const BMI_TABLE = [
  { max: 18.5, label: 'Pothranjenost', range: 'Ispod 18,5' },
  { max: 25, label: 'Normalna telesna masa', range: '18,5–24,9' },
  { max: 30, label: 'Prekomerna telesna masa', range: '25,0–29,9' },
  { max: 35, label: 'Gojaznost I stepena', range: '30,0–34,9' },
  { max: 40, label: 'Gojaznost II stepena', range: '35,0–39,9' },
  { max: Infinity, label: 'Gojaznost III stepena', range: '40,0 i više' },
] as const

type ValueOf<T extends readonly Option[]> = T[number]['value']
const valuesOf = <const T extends readonly Option[]>(options: T) =>
  options.map((o) => o.value) as unknown as [ValueOf<T>, ...ValueOf<T>[]]

// ===================== BMI =====================
/** BMI = telesna masa (kg) / visina (m)². Zaokruženo na jednu decimalu; null ako ulaz nije ispravan. */
export function calcBmi(heightCm: number, weightKg: number): number | null {
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || heightCm <= 0 || weightKg <= 0) {
    return null
  }
  const m = heightCm / 100
  return Math.round((weightKg / (m * m)) * 10) / 10
}

export function bmiCategory(bmi: number): (typeof BMI_TABLE)[number] {
  return BMI_TABLE.find((row) => bmi < row.max) ?? BMI_TABLE[BMI_TABLE.length - 1]
}

// ===================== POLJA PO KORACIMA =====================
const REQUIRED_CHOICE = 'Odaberite odgovor'
const choice = <const T extends readonly Option[]>(options: T) =>
  z.enum(valuesOf(options), { error: REQUIRED_CHOICE })
const text = (max: number) => z.string().trim().max(max, `Najviše ${max} znakova`).optional().default('')

/** Korak 5 · Vežbanje (primarni cilj i mesto treninga). */
export const trainingStep5Fields = {
  goals: z.array(z.enum(valuesOf(GOAL_OPTIONS))).min(1, 'Izaberite bar jedan cilj'),
  place: choice(PLACE_OPTIONS),
}

/** Korak 6 · Zdravlje i bezbednost. */
export const trainingStep6Fields = {
  doctor_limit: choice(YES_NO_UNSURE_OPTIONS),
  doctor_limit_reason: text(500),
  chest_pain: choice(YES_NO_OPTIONS),
  injury: choice(YES_NO_OPTIONS),
  medical_restriction: choice(YES_NO_UNSURE_OPTIONS),
  restriction_text: text(500),
}

/** Korak 7 · Trenažno iskustvo. */
export const trainingStep7Fields = {
  train_duration: choice(TRAIN_DURATION_OPTIONS),
  train_frequency: choice(TRAIN_FREQUENCY_OPTIONS),
  technique: choice(TECHNIQUE_OPTIONS),
  long_break: choice(YES_NO_OPTIONS),
}

/** Korak 8 · Test motoričkih sposobnosti. */
export const trainingStep8Fields = {
  chair_stands: choice(CHAIR_STAND_OPTIONS),
  pushups_knees: choice(PUSHUP_OPTIONS),
  pushups_feet: choice(PUSHUP_OPTIONS),
  plank_knees: choice(PLANK_OPTIONS),
  plank_feet: choice(PLANK_OPTIONS),
  single_leg: choice(SINGLE_LEG_OPTIONS),
  movement_pain: choice(MOVEMENT_PAIN_OPTIONS),
}

/** Korak 9 · Kondicija i oporavak (+ prikaz opreme). */
export const trainingStep9Fields = {
  stairs: choice(STAIRS_OPTIONS),
  cardio_duration: choice(CARDIO_OPTIONS),
  recovery: choice(RECOVERY_OPTIONS),
}

type Ctx = z.RefinementCtx

/** Uslovna pitanja koraka 6: razlog i opis ograničenja su obavezni kad je odgovor Da. */
export function checkTrainingHealth(
  v: {
    doctor_limit?: string
    doctor_limit_reason?: string
    medical_restriction?: string
    restriction_text?: string
  },
  ctx: Ctx,
) {
  if (v.doctor_limit === 'yes' && !v.doctor_limit_reason) {
    ctx.addIssue({ code: 'custom', path: ['doctor_limit_reason'], message: 'Navedite razlog' })
  }
  if (v.medical_restriction === 'yes' && !v.restriction_text) {
    ctx.addIssue({ code: 'custom', path: ['restriction_text'], message: 'Opišite ograničenje' })
  }
}

/** Briše odgovore na uslovna pitanja čiji uslov ne važi (razlog, opis ograničenja). */
export function normalizeTraining<
  T extends {
    doctor_limit?: string
    doctor_limit_reason?: string
    medical_restriction?: string
    restriction_text?: string
  },
>(values: T): T {
  const out: T = { ...values }
  if (out.doctor_limit !== 'yes') delete out.doctor_limit_reason
  if (out.medical_restriction !== 'yes') delete out.restriction_text
  return out
}

// ===================== BEZBEDNOST I PREDLOG NIVOA =====================
export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced'

/**
 * Odgovori zbog kojih Ognjen mora da pogleda upitnik pre izrade plana. Aplikacija ne postavlja dijagnoze:
 * klijentu se samo preporučuje da se javi lekaru, a trener dobija oznaku.
 */
export function safetyFlags(a: AnswerLike): string[] {
  const flags: string[] = []
  if (a.doctor_limit === 'yes') flags.push('Lekar je ograničio fizičku aktivnost')
  if (a.chest_pain === 'yes') flags.push('Bol u grudima, nesvestica ili gušenje tokom aktivnosti')
  if (a.injury === 'yes') flags.push('Povreda ili bol koji utiče na vežbanje')
  if (a.medical_restriction === 'yes') flags.push('Medicinsko ograničenje za određene vežbe')
  if (a.movement_pain === 'yes' || a.movement_pain === 'sometimes') {
    flags.push('Bol ili gubitak kontrole tokom čučnja, iskoraka ili skleka')
  }
  return flags
}

/** Bol u grudima, nesvestica i ograničenje lekara: klijentu se prikazuje preporuka da se prvo javi lekaru. */
export function needsDoctorNotice(a: AnswerLike): boolean {
  return a.chest_pain === 'yes' || a.doctor_limit === 'yes'
}

/** Odgovori kakvi god da su stigli (nacrt, forma, baza): funkcije ispod gledaju samo ključeve koje poznaju. */
type AnswerLike = Readonly<Record<string, unknown>>

const index = (options: readonly Option[], value: unknown) =>
  Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )

export const MAX_TRAINING_SCORE = 31

/** Bodovi iz odgovora (0–31). Prekid duži od 3 meseca oduzima jedan bod. */
export function trainingScore(a: AnswerLike): number {
  const kneesPushups = a.pushups_knees === 'cant' ? 0 : index(PUSHUP_OPTIONS, a.pushups_knees)
  const feetPushups = a.pushups_feet === 'cant' ? -1 : index(PUSHUP_OPTIONS, a.pushups_feet)
  const pushups =
    feetPushups >= 0 ? 2 + Math.min(feetPushups, 2) : Math.min(Math.floor(kneesPushups / 2), 2)
  const plank = (value: unknown) => (value === 'unknown' ? 0 : index(PLANK_OPTIONS, value))
  const singleLeg = { stable: 2, difficult: 1 }[String(a.single_leg)] ?? 0
  const recovery = { '24_48h': 2, '2_3d': 1, no_experience: 1 }[String(a.recovery)] ?? 0

  const points =
    index(TRAIN_DURATION_OPTIONS, a.train_duration) +
    index(TRAIN_FREQUENCY_OPTIONS, a.train_frequency) +
    index(TECHNIQUE_OPTIONS, a.technique) +
    index(CHAIR_STAND_OPTIONS, a.chair_stands) +
    pushups +
    Math.max(plank(a.plank_knees), plank(a.plank_feet)) +
    singleLeg +
    index(STAIRS_OPTIONS, a.stairs) +
    index(CARDIO_OPTIONS, a.cardio_duration) +
    recovery -
    (a.long_break === 'yes' ? 1 : 0)
  return Math.max(0, points)
}

/** Predlog nivoa. Konačan nivo potvrđuje trener; kod bezbednosnih oznaka predlog je uvek početni. */
export function suggestedLevel(a: AnswerLike): TrainingLevel {
  if (safetyFlags(a).length > 0) return 'beginner'
  const share = trainingScore(a) / MAX_TRAINING_SCORE
  if (share >= 0.7) return 'advanced'
  if (share >= 0.4) return 'intermediate'
  return 'beginner'
}
