import { describe, expect, it } from 'vitest'
import {
  ageFromBirthDate,
  intakeSchema,
  normalizeIntake,
  normalizePhone,
  parseDecimal,
  step1Schema,
  step2Schema,
  step4Schema,
  step10Schema,
  toggleWorkExposure,
  todayInBelgrade,
} from './intakeSchema'
import { belgradeDate } from './programDay'

/** Potpuno ispravna anketa (žena, bez uslovnih odgovora). */
const valid = {
  full_name: 'Ana Marković',
  email: 'Ana@Primer.rs',
  phone: '064 123 4567',
  birth_date: '1992-03-14',
  occupation: 'Ekonomistkinja',
  sex: 'female',
  height_cm: '168',
  weight_kg: '70,5',
  country: 'Srbija',
  no_diagnoses: false,
  diagnoses: 'Insulinska rezistencija',
  symptoms: ['fatigue'],
  allergies: false,
  surgery: false,
  childhood_tonsillitis: 'no',
  pregnancies: '1',
  fluids: '1_1_5',
  activity: 'light',
  stool: 'daily',
  bedtime: '23:30',
  sleep_hours: '6_7',
  outdoor_time: 'lt30',
  low_sun_country: 'no',
  work_exposure: ['sitting_all_day'],
  disliked_foods: ['liver'],
  goals: ['fat_loss'],
  place: 'home',
  doctor_limit: 'no',
  chest_pain: 'no',
  injury: 'no',
  medical_restriction: 'no',
  train_duration: '3_12m',
  train_frequency: '1_2',
  technique: 'some',
  long_break: 'no',
  chair_stands: '10_19',
  pushups_knees: '5_10',
  pushups_feet: 'cant',
  plank_knees: '20_44',
  plank_feet: 'unknown',
  single_leg: 'difficult',
  movement_pain: 'no',
  stairs: 'breathless',
  cardio_duration: '20_40',
  recovery: '24_48h',
  channels: ['whatsapp', 'email'],
  consent_health: true,
  consent_terms: true,
}

type Result = { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }
const parse = (overrides: Record<string, unknown>) =>
  intakeSchema.safeParse({ ...valid, ...overrides }) as Result
const fieldsOf = (result: Result) => (result.error?.issues ?? []).map((i) => String(i.path[0]))

describe('ispravna anketa', () => {
  it('prolazi i normalizuje email, telefon i brojeve', () => {
    const result = intakeSchema.parse(valid)
    expect(result.email).toBe('ana@primer.rs')
    expect(result.phone).toBe('+381641234567')
    expect(result.height_cm).toBe(168)
    expect(result.weight_kg).toBe(70.5)
  })
})

describe('korak 1 · o vama', () => {
  it('traži sva obavezna polja', () => {
    const result = step1Schema.safeParse({}) as Result
    expect(result.success).toBe(false)
    expect(fieldsOf(result).sort()).toEqual(
      [
        'birth_date',
        'country',
        'email',
        'full_name',
        'height_cm',
        'occupation',
        'phone',
        'sex',
        'weight_kg',
      ].sort(),
    )
  })

  it('ime ima 2–80 znakova', () => {
    expect(fieldsOf(parse({ full_name: 'A' }))).toContain('full_name')
    expect(fieldsOf(parse({ full_name: 'A'.repeat(81) }))).toContain('full_name')
  })

  it('email mora biti ispravan', () => {
    expect(fieldsOf(parse({ email: 'ana@' }))).toContain('email')
  })

  it.each([
    ['064 123 4567', '+381641234567'],
    ['+381 64 123 4567', '+381641234567'],
    ['0038164 123-4567', '+381641234567'],
    ['+43 660 1234567', '+436601234567'],
  ])('telefon %s postaje %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
    expect(parse({ phone: input }).success).toBe(true)
  })

  it('odbija neispravan telefon', () => {
    expect(fieldsOf(parse({ phone: '12345' }))).toContain('phone')
    expect(fieldsOf(parse({ phone: 'abc' }))).toContain('phone')
  })

  it('17 godina ne prolazi, 18 prolazi', () => {
    const [y, m, d] = todayInBelgrade().split('-').map(Number)
    const dateAt = (years: number, dayShift = 0) =>
      new Date(Date.UTC(y - years, m - 1, d + dayShift)).toISOString().slice(0, 10)

    const seventeen = parse({ birth_date: dateAt(18, 1) }) // sutra puni 18
    expect(fieldsOf(seventeen)).toContain('birth_date')
    expect(seventeen.error?.issues.find((i) => i.path[0] === 'birth_date')?.message).toBe(
      'Program je za osobe starije od 18 godina',
    )

    expect(parse({ birth_date: dateAt(18) }).success).toBe(true) // danas puni 18
  })

  it('odbija starost iznad 100 i nepostojeći datum', () => {
    expect(fieldsOf(parse({ birth_date: '1900-01-01' }))).toContain('birth_date')
    expect(fieldsOf(parse({ birth_date: '1992-02-31' }))).toContain('birth_date')
  })

  it('visina 120–220, težina 35–250 (zarez ili tačka)', () => {
    expect(fieldsOf(parse({ height_cm: '119' }))).toContain('height_cm')
    expect(fieldsOf(parse({ height_cm: '221' }))).toContain('height_cm')
    expect(parse({ height_cm: '120' }).success).toBe(true)
    expect(fieldsOf(parse({ weight_kg: '34,9' }))).toContain('weight_kg')
    expect(fieldsOf(parse({ weight_kg: '250,1' }))).toContain('weight_kg')
    expect(parse({ weight_kg: '70.5' }).success).toBe(true)
    expect(parse({ weight_kg: 70.5 }).success).toBe(true)
    expect(fieldsOf(parse({ weight_kg: '' }))).toContain('weight_kg')
  })

  it('parseDecimal čita zarez', () => {
    expect(parseDecimal('70,5')).toBe(70.5)
    expect(parseDecimal(' 70.5 ')).toBe(70.5)
    expect(parseDecimal('')).toBeNaN()
  })
})

describe('starost', () => {
  it('računa pune godine', () => {
    expect(ageFromBirthDate('1992-03-14', '2026-03-13')).toBe(33)
    expect(ageFromBirthDate('1992-03-14', '2026-03-14')).toBe(34)
    expect(ageFromBirthDate('1992-02-30', '2026-03-14')).toBeNull()
  })

  it('današnji datum je isti kao belgradeDate iz programDay.ts', () => {
    const now = new Date('2026-06-15T22:30:00Z')
    expect(todayInBelgrade(now)).toBe(belgradeDate(now))
  })
})

describe('korak 2 · zdravlje', () => {
  const base = {
    sex: 'female',
    diagnoses: 'Hipotireoza',
    allergies: false,
    surgery: false,
    childhood_tonsillitis: 'no',
    pregnancies: '0',
  }
  const run = (overrides: Record<string, unknown>) =>
    step2Schema.safeParse({ ...base, ...overrides }) as Result

  it('dijagnoze su obavezne osim ako je štikliran „Nemam dijagnoza“', () => {
    expect(fieldsOf(run({ diagnoses: '' }))).toContain('diagnoses')
    expect(run({ diagnoses: '', no_diagnoses: true }).success).toBe(true)
  })

  it('„Ostalo“ traži opis simptoma', () => {
    expect(fieldsOf(run({ symptoms: ['other'] }))).toContain('symptoms_other')
    expect(run({ symptoms: ['other'], symptoms_other: 'Vrtoglavica' }).success).toBe(true)
  })

  it('alergije i operacija traže tekst kad je odgovor Da', () => {
    expect(fieldsOf(run({ allergies: true }))).toContain('allergies_text')
    expect(fieldsOf(run({ surgery: true }))).toContain('surgery_text')
    expect(
      run({
        allergies: true,
        allergies_text: 'Orasi',
        surgery: true,
        surgery_text: 'Krajnici, 2004.',
      }).success,
    ).toBe(true)
  })

  it('Da/Ne pitanja su obavezna', () => {
    expect(fieldsOf(run({ allergies: undefined, surgery: undefined }))).toEqual(
      expect.arrayContaining(['allergies', 'surgery']),
    )
  })

  it('broj trudnoća je obavezan samo za žene', () => {
    expect(fieldsOf(run({ pregnancies: undefined }))).toContain('pregnancies')
    expect(run({ sex: 'male', pregnancies: undefined }).success).toBe(true)
  })
})

describe('korak 4 · posao i ishrana', () => {
  it('„Ništa od navedenog“ se ne kombinuje sa ostalim', () => {
    expect(step4Schema.safeParse({ work_exposure: ['none', 'stress'] }).success).toBe(false)
    expect(step4Schema.safeParse({ work_exposure: ['none'] }).success).toBe(true)
  })

  it('toggleWorkExposure: „Ništa od navedenog“ isključuje ostale i obrnuto', () => {
    expect(toggleWorkExposure(['stress', 'deadlines'], 'none')).toEqual(['none'])
    expect(toggleWorkExposure(['none'], 'stress')).toEqual(['stress'])
    expect(toggleWorkExposure(['stress'], 'stress')).toEqual([])
    expect(toggleWorkExposure(['none'], 'none')).toEqual([])
  })

  it('napomena ima najviše 2000 znakova', () => {
    expect(step4Schema.safeParse({ notes: 'a'.repeat(2001) }).success).toBe(false)
  })
})

describe('korak 10 · nalazi i saglasnost', () => {
  const base = { channels: ['email'], consent_health: true, consent_terms: true }
  const file = (i: number, size = 1000) => ({
    path: `intake/x/${i}.pdf`,
    name: `${i}.pdf`,
    size,
    type: 'application/pdf',
  })

  it('traži bar jedan kanal i obe saglasnosti', () => {
    expect(step10Schema.safeParse({ ...base, channels: [] }).success).toBe(false)
    expect(step10Schema.safeParse({ ...base, consent_health: false }).success).toBe(false)
    expect(step10Schema.safeParse({ ...base, consent_terms: false }).success).toBe(false)
    expect(step10Schema.safeParse(base).success).toBe(true)
  })

  it('nalazi nisu obavezni, ali ih je najviše 10 i svaki do 10 MB', () => {
    expect(step10Schema.safeParse(base).success).toBe(true)
    const ten = Array.from({ length: 10 }, (_, i) => file(i))
    expect(step10Schema.safeParse({ ...base, lab_files: ten }).success).toBe(true)
    expect(step10Schema.safeParse({ ...base, lab_files: [...ten, file(10)] }).success).toBe(false)
    expect(
      step10Schema.safeParse({ ...base, lab_files: [file(1, 10 * 1024 * 1024 + 1)] }).success,
    ).toBe(false)
  })
})

describe('uslovna polja se brišu kad uslov nestane', () => {
  it('cela anketa izbacuje odgovore na pitanja koja više ne važe', () => {
    const result = intakeSchema.parse({
      ...valid,
      sex: 'male',
      pregnancies: '2',
      allergies: false,
      allergies_text: 'Orasi',
      surgery: false,
      surgery_text: 'Nešto',
      symptoms: ['fatigue'],
      symptoms_other: 'Staro',
    })
    expect(result).not.toHaveProperty('pregnancies')
    expect(result).not.toHaveProperty('allergies_text')
    expect(result).not.toHaveProperty('surgery_text')
    expect(result).not.toHaveProperty('symptoms_other')
  })

  it('normalizeIntake čuva odgovore kad uslov važi', () => {
    const out = normalizeIntake({
      sex: 'female',
      pregnancies: '2',
      allergies: true,
      allergies_text: 'Orasi',
      surgery: true,
      surgery_text: 'Krajnici',
      symptoms: ['other'],
      symptoms_other: 'Vrtoglavica',
    })
    expect(out).toMatchObject({
      pregnancies: '2',
      allergies_text: 'Orasi',
      surgery_text: 'Krajnici',
      symptoms_other: 'Vrtoglavica',
    })
  })

  it('„Nemam dijagnoza“ prazni polje dijagnoza', () => {
    expect(normalizeIntake({ no_diagnoses: true, diagnoses: 'Staro' }).diagnoses).toBe('')
  })
})

describe('Ognjenova pitanja (koraci 5–9) u celoj anketi', () => {
  it('traže se svi odgovori', () => {
    const rest: Record<string, unknown> = { ...valid }
    delete rest.goals
    delete rest.place
    const result = intakeSchema.safeParse(rest) as Result
    expect(result.success).toBe(false)
    expect(fieldsOf(result)).toEqual(expect.arrayContaining(['goals', 'place']))
  })

  it('razlog je obavezan kad lekar ograničava aktivnost, a briše se kad više ne važi', () => {
    expect(parse({ doctor_limit: 'yes' }).success).toBe(false)
    expect(parse({ doctor_limit: 'yes', doctor_limit_reason: 'Srce' }).success).toBe(true)
    const out = intakeSchema.parse({
      ...valid,
      doctor_limit_reason: 'Staro',
      restriction_text: 'Staro',
    })
    expect(out).not.toHaveProperty('doctor_limit_reason')
    expect(out).not.toHaveProperty('restriction_text')
  })
})
