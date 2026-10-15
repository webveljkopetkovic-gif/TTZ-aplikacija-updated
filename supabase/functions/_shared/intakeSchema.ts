/**
 * Šema ankete (docs/ANKETA.md, sekcija 3). Jedini izvor istine: koristi je forma (src/lib/intakeSchema.ts
 * je re-eksportuje) i Edge Function `submit-intake`. Fajl sme da importuje samo `zod`, da radi i u Deno-u.
 * Tekstovi pitanja su Olgicini, ne menjaju se bez pitanja.
 */
import { z } from 'zod'
import {
  checkTrainingHealth,
  normalizeTraining,
  trainingStep5Fields,
  trainingStep6Fields,
  trainingStep7Fields,
  trainingStep8Fields,
  trainingStep9Fields,
} from './trainingSchema.ts'

/** Verzija 2: dodata Ognjenova pitanja (koraci 5–9), saglasnost je korak 10. */
export const INTAKE_SCHEMA_VERSION = 2
/** Broj koraka ankete: 1–4 Olgica, 5–9 Ognjen, 10 nalazi i saglasnost. */
export const ANKETA_STEPS = 10
export const MAX_LAB_FILES = 10
export const MAX_LAB_FILE_BYTES = 10 * 1024 * 1024
export const LAB_FILE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'heic'] as const

// ===================== OPCIJE (vrednosti su stabilni ključevi, labele su na srpskom) =====================
export interface Option {
  readonly value: string
  readonly label: string
  readonly description?: string
}

export const SEX_OPTIONS = [
  { value: 'female', label: 'Žena' },
  { value: 'male', label: 'Muškarac' },
] as const

export const SYMPTOM_OPTIONS = [
  { value: 'fatigue', label: 'Umor' },
  { value: 'hair_loss', label: 'Opadanje kose' },
  { value: 'bloating', label: 'Nadutost' },
  { value: 'headache', label: 'Glavobolja' },
  { value: 'poor_sleep', label: 'Loš san' },
  { value: 'heartburn', label: 'Gorušica' },
  { value: 'constipation', label: 'Zatvor' },
  { value: 'nervousness', label: 'Nervoza' },
  { value: 'dry_skin', label: 'Suva koža' },
  { value: 'mood_changes', label: 'Promene raspoloženja' },
  { value: 'other', label: 'Ostalo' },
] as const

export const TONSILLITIS_OPTIONS = [
  { value: 'yes', label: 'Da' },
  { value: 'no', label: 'Ne' },
  { value: 'dont_remember', label: 'Ne sećam se' },
] as const

export const PREGNANCY_OPTIONS = [
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4plus', label: '4+' },
] as const

export const FLUID_OPTIONS = [
  { value: 'lt1', label: '< 1 l' },
  { value: '1_1_5', label: '1–1,5 l' },
  { value: '1_5_2', label: '1,5–2 l' },
  { value: 'gt2', label: '> 2 l' },
] as const

export const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedeći', description: 'Uglavnom sedim, bez vežbanja' },
  { value: 'light', label: 'Lagan', description: 'Šetnje, povremeno vežbanje' },
  { value: 'moderate', label: 'Umeren', description: 'Vežbam 2–3 puta nedeljno' },
  { value: 'high', label: 'Visok', description: 'Vežbam 4 i više puta nedeljno' },
] as const

export const STOOL_OPTIONS = [
  { value: 'daily', label: 'Da, svaki dan' },
  { value: 'every_2_3_days', label: 'Na 2–3 dana' },
  { value: 'rarer', label: 'Ređe od toga' },
  { value: 'irregular', label: 'Neujednačeno, smenjuje se' },
] as const

export const SLEEP_HOURS_OPTIONS = [
  { value: 'lt6', label: '< 6 h' },
  { value: '6_7', label: '6–7 h' },
  { value: '7_8', label: '7–8 h' },
  { value: 'gt8', label: '> 8 h' },
] as const

export const OUTDOOR_OPTIONS = [
  { value: 'lt30', label: '< 30 min' },
  { value: '30_60', label: '30–60 min' },
  { value: '1_2h', label: '1–2 h' },
  { value: 'gt2h', label: '> 2 h' },
] as const

export const LOW_SUN_OPTIONS = [
  { value: 'yes', label: 'Da' },
  { value: 'no', label: 'Ne' },
  { value: 'unknown', label: 'Ne znam' },
] as const

export const WORK_EXPOSURE_OPTIONS = [
  { value: 'chemicals', label: 'Hemikalije' },
  { value: 'stress', label: 'Preteran stres' },
  { value: 'deadlines', label: 'Rokovi' },
  { value: 'mobbing', label: 'Mobing' },
  { value: 'night_shifts', label: 'Noćne smene' },
  { value: 'sitting_all_day', label: 'Ceo dan sedim' },
  { value: 'none', label: 'Ništa od navedenog' },
] as const

export const DISLIKED_FOOD_OPTIONS = [
  { value: 'fish', label: 'Riba' },
  { value: 'liver', label: 'Jetra i iznutrice' },
  { value: 'milk', label: 'Mleko' },
  { value: 'eggs', label: 'Jaja' },
  { value: 'mushrooms', label: 'Pečurke' },
  { value: 'cabbage', label: 'Prokelj i kupus' },
  { value: 'legumes', label: 'Mahunarke' },
] as const

export const CHANNEL_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
] as const

type ValueOf<T extends readonly Option[]> = T[number]['value']

export function labelOf(options: readonly Option[], value: string | undefined): string {
  return options.find((o) => o.value === value)?.label ?? ''
}

const valuesOf = <const T extends readonly Option[]>(options: T) =>
  options.map((o) => o.value) as unknown as [ValueOf<T>, ...ValueOf<T>[]]

// ===================== POMOĆNE FUNKCIJE =====================
const REQUIRED_CHOICE = 'Odaberite odgovor'

/** Telefon u E.164: razmaci i crtice se skidaju, vodeća 0 postaje +381, 00 postaje +. */
export function normalizePhone(raw: string): string {
  const s = raw.replace(/[\s().-]/g, '')
  if (s.startsWith('00')) return '+' + s.slice(2)
  if (s.startsWith('0')) return '+381' + s.slice(1)
  return s
}

/** Decimalni broj sa zarezom ili tačkom. Prazno ili neispravno daje NaN. */
export function parseDecimal(value: string | number): number {
  if (typeof value === 'number') return value
  const trimmed = value.trim().replace(',', '.')
  return trimmed === '' ? NaN : Number(trimmed)
}

function decimal(label: string, min: number, max: number) {
  return z
    .union([z.string(), z.number()], { error: `Unesite ${label}` })
    .transform(parseDecimal)
    .pipe(
      z
        .number({ error: `Unesite ${label}` })
        .min(min, `${label[0].toUpperCase()}${label.slice(1)} mora biti između ${min} i ${max}`)
        .max(max, `${label[0].toUpperCase()}${label.slice(1)} mora biti između ${min} i ${max}`),
    )
}

/** Današnji datum po Europe/Belgrade ('YYYY-MM-DD'). Isto što i belgradeDate u src/lib/programDay.ts. */
export function todayInBelgrade(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Belgrade',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Starost u punim godinama. Null ako datum ne postoji. */
export function ageFromBirthDate(birthDate: string, today: string = todayInBelgrade()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const check = new Date(Date.UTC(y, mo - 1, d))
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    return null
  }
  const [ty, tm, td] = today.split('-').map(Number)
  let age = ty - y
  if (tm < mo || (tm === mo && td < d)) age -= 1
  return age
}

const text = (max: number) => z.string().trim().max(max, `Najviše ${max} znakova`).optional().default('')
const choice = <const T extends readonly Option[]>(options: T) =>
  z.enum(valuesOf(options), { error: REQUIRED_CHOICE })
const yesNo = z.boolean({ error: REQUIRED_CHOICE })

// ===================== KORACI =====================
const step1Fields = {
  full_name: z.string().trim().min(2, 'Unesite ime i prezime').max(80, 'Najviše 80 znakova'),
  email: z.string().trim().toLowerCase().pipe(z.email('Unesite ispravan email')),
  phone: z
    .string()
    .trim()
    .transform(normalizePhone)
    .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, 'Unesite broj u formatu +381 64 123 4567')),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Unesite datum rođenja'),
  occupation: z.string().trim().min(2, 'Unesite zanimanje').max(80, 'Najviše 80 znakova'),
  sex: choice(SEX_OPTIONS),
  height_cm: decimal('visinu', 120, 220),
  weight_kg: decimal('težinu', 35, 250),
  country: z.string().trim().min(2, 'Unesite državu').max(60, 'Najviše 60 znakova'),
}

const step2Fields = {
  // `sex` dolazi iz koraka 1, ovde služi samo za uslovno pitanje o trudnoćama
  sex: z.enum(valuesOf(SEX_OPTIONS)).optional(),
  no_diagnoses: z.boolean().optional().default(false),
  diagnoses: text(1000),
  symptoms: z.array(z.enum(valuesOf(SYMPTOM_OPTIONS))).optional().default([]),
  symptoms_other: text(500),
  allergies: yesNo,
  allergies_text: text(500),
  therapy_past: text(1000),
  therapy_current: text(1000),
  surgery: yesNo,
  surgery_text: text(500),
  childhood_tonsillitis: choice(TONSILLITIS_OPTIONS),
  pregnancies: z.enum(valuesOf(PREGNANCY_OPTIONS)).optional(),
}

const step3Fields = {
  fluids: choice(FLUID_OPTIONS),
  activity: choice(ACTIVITY_OPTIONS),
  stool: choice(STOOL_OPTIONS),
  bedtime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Unesite vreme odlaska na spavanje'),
  sleep_hours: choice(SLEEP_HOURS_OPTIONS),
  outdoor_time: choice(OUTDOOR_OPTIONS),
  low_sun_country: choice(LOW_SUN_OPTIONS),
}

const step4Fields = {
  work_exposure: z.array(z.enum(valuesOf(WORK_EXPOSURE_OPTIONS))).optional().default([]),
  work_other: text(500),
  disliked_foods: z.array(z.enum(valuesOf(DISLIKED_FOOD_OPTIONS))).optional().default([]),
  disliked_other: text(500),
  notes: text(2000),
}

export const labFileSchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1).max(200),
  size: z.number().int().positive().max(MAX_LAB_FILE_BYTES, 'Fajl je veći od 10 MB'),
  type: z.string(),
})
export type LabFileRef = z.infer<typeof labFileSchema>

const step10Fields = {
  lab_files: z.array(labFileSchema).max(MAX_LAB_FILES, 'Najviše 10 fajlova').optional().default([]),
  channels: z.array(z.enum(valuesOf(CHANNEL_OPTIONS))).min(1, 'Izaberite bar jedan način'),
  consent_health: z.literal(true, { error: 'Saglasnost je obavezna' }),
  consent_terms: z.literal(true, { error: 'Potvrda je obavezna' }),
}

// ===================== USLOVNA PRAVILA =====================
type Ctx = z.RefinementCtx
const issue = (ctx: Ctx, path: string, message: string) =>
  ctx.addIssue({ code: 'custom', path: [path], message })

function checkStep1(v: { birth_date: string }, ctx: Ctx) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.birth_date)) return
  const age = ageFromBirthDate(v.birth_date)
  if (age === null) issue(ctx, 'birth_date', 'Unesite ispravan datum rođenja')
  else if (age < 18) issue(ctx, 'birth_date', 'Program je za osobe starije od 18 godina')
  else if (age > 100) issue(ctx, 'birth_date', 'Proverite datum rođenja')
}

function checkStep2(
  v: {
    sex?: string
    no_diagnoses: boolean
    diagnoses: string
    symptoms: string[]
    symptoms_other: string
    allergies: boolean
    allergies_text: string
    surgery: boolean
    surgery_text: string
    pregnancies?: string
  },
  ctx: Ctx,
) {
  if (!v.no_diagnoses && v.diagnoses === '') {
    issue(ctx, 'diagnoses', 'Navedite dijagnoze ili označite „Nemam dijagnoza“')
  }
  if (v.symptoms.includes('other') && v.symptoms_other === '') {
    issue(ctx, 'symptoms_other', 'Opišite simptom')
  }
  if (v.allergies && v.allergies_text === '') issue(ctx, 'allergies_text', 'Navedite koje alergije')
  if (v.surgery && v.surgery_text === '') issue(ctx, 'surgery_text', 'Navedite koju operaciju i kada')
  if (v.sex === 'female' && !v.pregnancies) issue(ctx, 'pregnancies', REQUIRED_CHOICE)
}

function checkStep4(v: { work_exposure: string[] }, ctx: Ctx) {
  if (v.work_exposure.includes('none') && v.work_exposure.length > 1) {
    issue(ctx, 'work_exposure', '„Ništa od navedenog“ se ne kombinuje sa ostalim izborima')
  }
}

export const step1Schema = z.object(step1Fields).superRefine(checkStep1)
export const step2Schema = z.object(step2Fields).superRefine(checkStep2)
export const step3Schema = z.object(step3Fields)
export const step4Schema = z.object(step4Fields).superRefine(checkStep4)
export const step5Schema = z.object(trainingStep5Fields)
export const step6Schema = z.object(trainingStep6Fields).superRefine(checkTrainingHealth)
export const step7Schema = z.object(trainingStep7Fields)
export const step8Schema = z.object(trainingStep8Fields)
export const step9Schema = z.object(trainingStep9Fields)
export const step10Schema = z.object(step10Fields)

export const stepSchemas = [
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
  step8Schema,
  step9Schema,
  step10Schema,
] as const

/** Imena polja po koracima (1–10), za povratak na prvi korak sa greškom. */
export const STEP_FIELDS: readonly (readonly string[])[] = [
  Object.keys(step1Fields),
  Object.keys(step2Fields).filter((k) => k !== 'sex'), // `sex` je iz koraka 1
  Object.keys(step3Fields),
  Object.keys(step4Fields),
  Object.keys(trainingStep5Fields),
  Object.keys(trainingStep6Fields),
  Object.keys(trainingStep7Fields),
  Object.keys(trainingStep8Fields),
  Object.keys(trainingStep9Fields),
  Object.keys(step10Fields),
]

/** Broj koraka (1–10) u kom je polje, ili null ako ga nema. */
export function stepOfField(field: string): number | null {
  const index = STEP_FIELDS.findIndex((fields) => fields.includes(field))
  return index === -1 ? null : index + 1
}

/** Cela anketa. Uslovna polja koja ne važe se brišu (vidi normalizeIntake). */
export const intakeSchema = z
  .object({
    ...step1Fields,
    ...step2Fields,
    ...step3Fields,
    ...step4Fields,
    ...trainingStep5Fields,
    ...trainingStep6Fields,
    ...trainingStep7Fields,
    ...trainingStep8Fields,
    ...trainingStep9Fields,
    ...step10Fields,
  })
  .superRefine((v, ctx) => {
    checkStep1(v, ctx)
    checkStep2({ ...v, sex: v.sex }, ctx)
    checkStep4(v, ctx)
    checkTrainingHealth(v, ctx)
  })
  .transform((v) => normalizeIntake(v))

export type IntakeInput = z.input<typeof intakeSchema>
export type IntakeAnswers = z.output<typeof intakeSchema>

/** Svi koraci imaju ove ključeve u nacrtu (nacrt je delimičan dok se anketa popunjava). */
export type IntakeDraftValues = Partial<IntakeInput>

/**
 * Briše odgovore na uslovna pitanja čiji uslov više ne važi (ANKETA.md sekcija 4) i
 * izbacuje „Ništa od navedenog“ ako je izabrano još nešto, odnosno ostale ako je izabrano ono.
 */
export function normalizeIntake<
  T extends {
    sex?: string
    allergies?: boolean
    allergies_text?: string
    surgery?: boolean
    surgery_text?: string
    symptoms?: string[]
    symptoms_other?: string
    pregnancies?: string
    no_diagnoses?: boolean
    diagnoses?: string
    doctor_limit?: string
    doctor_limit_reason?: string
    medical_restriction?: string
    restriction_text?: string
  },
>(values: T): T {
  const out: T = normalizeTraining({ ...values })
  if (out.allergies !== true) delete out.allergies_text
  if (out.surgery !== true) delete out.surgery_text
  if (out.sex !== 'female') delete out.pregnancies
  if (!out.symptoms?.includes('other')) delete out.symptoms_other
  if (out.no_diagnoses) out.diagnoses = ''
  return out
}

/** Pri izboru u grupi: „Ništa od navedenog“ isključuje ostale i obrnuto. */
export function toggleWorkExposure(current: readonly string[], value: string): string[] {
  if (value === 'none') return current.includes('none') ? [] : ['none']
  const without = current.filter((v) => v !== 'none')
  return without.includes(value) ? without.filter((v) => v !== value) : [...without, value]
}
