/**
 * Prikaz ankete u zdravstvenom dosijeu (ANKETA.md sekcija 6). Radi nad redom iz baze, pa je tolerantan:
 * stariji (seed) odgovori mogu imati labele umesto ključeva, a Ognjenov deo može da nedostaje.
 */
import {
  ACTIVITY_OPTIONS,
  ageFromBirthDate,
  CHANNEL_OPTIONS,
  DISLIKED_FOOD_OPTIONS,
  FLUID_OPTIONS,
  LOW_SUN_OPTIONS,
  OUTDOOR_OPTIONS,
  SLEEP_HOURS_OPTIONS,
  STOOL_OPTIONS,
  SYMPTOM_OPTIONS,
  TONSILLITIS_OPTIONS,
  WORK_EXPOSURE_OPTIONS,
  type Option,
} from './intakeSchema'
import {
  CARDIO_OPTIONS,
  CHAIR_STAND_OPTIONS,
  GOAL_OPTIONS,
  MOVEMENT_PAIN_OPTIONS,
  PLACE_OPTIONS,
  PLANK_OPTIONS,
  PUSHUP_OPTIONS,
  RECOVERY_OPTIONS,
  SINGLE_LEG_OPTIONS,
  STAIRS_OPTIONS,
  TECHNIQUE_OPTIONS,
  TRAIN_DURATION_OPTIONS,
  TRAIN_FREQUENCY_OPTIONS,
  YES_NO_OPTIONS,
  YES_NO_UNSURE_OPTIONS,
  safetyFlags,
  suggestedLevel,
} from './trainingSchema'

export interface IntakeRow {
  full_name: string
  birth_date: string
  occupation: string
  height_cm: number
  start_weight_kg: number
  activity_level: string
  answers: unknown
}

export interface Row {
  label: string
  value: string
}

type Answers = Record<string, unknown>
const asAnswers = (v: unknown): Answers => (v && typeof v === 'object' ? (v as Answers) : {})

/** Labela za ključ opcije; ako je u bazi već labela (stariji zapis), prikazuje se kakva jeste. */
export function display(options: readonly Option[], value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'
  const key = String(value)
  return options.find((o) => o.value === key)?.label ?? key
}

function displayList(options: readonly Option[], values: unknown, other?: unknown): string {
  const list = Array.isArray(values) ? values.map((v) => display(options, v)) : []
  const filtered = list.filter((v) => v !== 'Ništa od navedenog' && v !== 'Ostalo')
  const extra = typeof other === 'string' && other.trim() !== '' ? [other.trim()] : []
  const all = [...filtered, ...extra]
  return all.length > 0 ? all.join(', ') : '—'
}

const yesNo = (v: unknown) => (v === true ? 'Da' : v === false ? 'Ne' : '—')

/** Kratki pregled (11 redova kao na dizajnu). */
export function dossierSummary(row: IntakeRow, today?: string): Row[] {
  const a = asAnswers(row.answers)
  const age = ageFromBirthDate(row.birth_date, today)
  const diagnoses = a.no_diagnoses ? 'Nema dijagnoza' : String(a.diagnoses || '—')
  const allergies =
    a.allergies === false ? 'Nema' : a.allergies === true ? String(a.allergies_text || 'Da') : '—'
  return [
    { label: 'Godine · posao', value: `${age ?? '?'} god · ${row.occupation}` },
    { label: 'Dijagnoze', value: diagnoses },
    { label: 'Simptomi', value: displayList(SYMPTOM_OPTIONS, a.symptoms, a.symptoms_other) },
    { label: 'Alergije', value: allergies },
    { label: 'Terapija sada', value: String(a.therapy_current || '—') },
    { label: 'Visina · start', value: `${row.height_cm} cm · ${row.start_weight_kg} kg` },
    { label: 'Aktivnost', value: display(ACTIVITY_OPTIONS, row.activity_level) },
    {
      label: 'San · stolica',
      value: `${display(SLEEP_HOURS_OPTIONS, a.sleep_hours)} · ${display(STOOL_OPTIONS, a.stool)}`,
    },
    {
      label: 'Tečnost · napolju',
      value: `${display(FLUID_OPTIONS, a.fluids)} · ${display(OUTDOOR_OPTIONS, a.outdoor_time)}`,
    },
    { label: 'Posao', value: displayList(WORK_EXPOSURE_OPTIONS, a.work_exposure, a.work_other) },
    {
      label: 'Ne voli',
      value: displayList(DISLIKED_FOOD_OPTIONS, a.disliked_foods, a.disliked_other),
    },
  ]
}

/** Svi odgovori po koracima (dugme „Svi odgovori iz ankete“). */
export function dossierSections(row: IntakeRow): { title: string; rows: Row[] }[] {
  const a = asAnswers(row.answers)
  const text = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : '—')
  return [
    {
      title: 'O vama',
      rows: [
        { label: 'Zanimanje', value: row.occupation },
        { label: 'Visina', value: `${row.height_cm} cm` },
        { label: 'Težina', value: `${row.start_weight_kg} kg` },
      ],
    },
    {
      title: 'Zdravlje',
      rows: [
        { label: 'Dijagnoze', value: a.no_diagnoses ? 'Nema dijagnoza' : text(a.diagnoses) },
        { label: 'Simptomi', value: displayList(SYMPTOM_OPTIONS, a.symptoms, a.symptoms_other) },
        {
          label: 'Alergije',
          value: a.allergies === true ? text(a.allergies_text) : yesNo(a.allergies),
        },
        { label: 'Terapija ranije', value: text(a.therapy_past) },
        { label: 'Terapija sada', value: text(a.therapy_current) },
        { label: 'Operacije', value: a.surgery === true ? text(a.surgery_text) : yesNo(a.surgery) },
        {
          label: 'Angine u detinjstvu',
          value: display(TONSILLITIS_OPTIONS, a.childhood_tonsillitis),
        },
        {
          label: 'Trudnoće',
          value: a.pregnancies === undefined ? '—' : String(a.pregnancies).replace('4plus', '4+'),
        },
      ],
    },
    {
      title: 'Navike i san',
      rows: [
        { label: 'Tečnost', value: display(FLUID_OPTIONS, a.fluids) },
        { label: 'Aktivnost', value: display(ACTIVITY_OPTIONS, row.activity_level) },
        { label: 'Stolica', value: display(STOOL_OPTIONS, a.stool) },
        { label: 'Odlazak na spavanje', value: text(a.bedtime) },
        { label: 'San', value: display(SLEEP_HOURS_OPTIONS, a.sleep_hours) },
        { label: 'Napolju', value: display(OUTDOOR_OPTIONS, a.outdoor_time) },
        { label: 'Malo sunca', value: display(LOW_SUN_OPTIONS, a.low_sun_country) },
      ],
    },
    {
      title: 'Posao i ishrana',
      rows: [
        {
          label: 'Posao',
          value: displayList(WORK_EXPOSURE_OPTIONS, a.work_exposure, a.work_other),
        },
        {
          label: 'Ne voli',
          value: displayList(DISLIKED_FOOD_OPTIONS, a.disliked_foods, a.disliked_other),
        },
        { label: 'Napomena', value: text(a.notes) },
      ],
    },
    {
      title: 'Poruke',
      rows: [{ label: 'Kanali', value: displayList(CHANNEL_OPTIONS, a.channels) }],
    },
  ]
}

export interface TrainingView {
  /** Ognjenovi odgovori su popunjeni (stariji zapisi ih nemaju). */
  answered: boolean
  rows: Row[]
  flags: string[]
  suggested: 'beginner' | 'intermediate' | 'advanced'
}

/** Ognjenovi odgovori (koraci 5–9), bezbednosne oznake i predlog nivoa. */
export function trainingView(answers: unknown): TrainingView {
  const a = asAnswers(answers)
  const answered = typeof a.place === 'string' && typeof a.train_duration === 'string'
  const goals = Array.isArray(a.goals)
    ? a.goals.map((g) => display(GOAL_OPTIONS, g)).join(', ')
    : '—'
  const rows: Row[] = [
    { label: 'Cilj', value: goals },
    { label: 'Mesto treninga', value: display(PLACE_OPTIONS, a.place) },
    {
      label: 'Lekar ograničio aktivnost',
      value:
        display(YES_NO_UNSURE_OPTIONS, a.doctor_limit) +
        (a.doctor_limit_reason ? ` · ${String(a.doctor_limit_reason)}` : ''),
    },
    { label: 'Bol u grudima, nesvestica', value: display(YES_NO_OPTIONS, a.chest_pain) },
    { label: 'Povreda ili bol', value: display(YES_NO_OPTIONS, a.injury) },
    {
      label: 'Medicinsko ograničenje',
      value:
        display(YES_NO_UNSURE_OPTIONS, a.medical_restriction) +
        (a.restriction_text ? ` · ${String(a.restriction_text)}` : ''),
    },
    { label: 'Trenira', value: display(TRAIN_DURATION_OPTIONS, a.train_duration) },
    { label: 'Učestalost (3 meseca)', value: display(TRAIN_FREQUENCY_OPTIONS, a.train_frequency) },
    { label: 'Tehnika', value: display(TECHNIQUE_OPTIONS, a.technique) },
    { label: 'Pauza > 3 meseca', value: display(YES_NO_OPTIONS, a.long_break) },
    { label: 'Sedanje sa stolice', value: display(CHAIR_STAND_OPTIONS, a.chair_stands) },
    { label: 'Sklekovi (kolena)', value: display(PUSHUP_OPTIONS, a.pushups_knees) },
    { label: 'Sklekovi (stopala)', value: display(PUSHUP_OPTIONS, a.pushups_feet) },
    { label: 'Plank (kolena)', value: display(PLANK_OPTIONS, a.plank_knees) },
    { label: 'Plank (stopala)', value: display(PLANK_OPTIONS, a.plank_feet) },
    { label: 'Jedna noga 30 s', value: display(SINGLE_LEG_OPTIONS, a.single_leg) },
    { label: 'Bol u pokretu', value: display(MOVEMENT_PAIN_OPTIONS, a.movement_pain) },
    { label: 'Stepenice 3–4 sprata', value: display(STAIRS_OPTIONS, a.stairs) },
    { label: 'Brzo hodanje', value: display(CARDIO_OPTIONS, a.cardio_duration) },
    { label: 'Oporavak', value: display(RECOVERY_OPTIONS, a.recovery) },
  ]
  return { answered, rows, flags: answered ? safetyFlags(a) : [], suggested: suggestedLevel(a) }
}

/** Broj odgovora u anketi: pitanja iz kolona (9) + neprazni odgovori. */
export function answerCount(answers: unknown): number {
  const filled = Object.values(asAnswers(answers)).filter(
    (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0),
  )
  return 9 + filled.length
}
