import { describe, expect, it } from 'vitest'
import { countIntakeAnswers, exerciseLevelFromActivity, intakeSummary } from './intakeDerived'
import { intakeSchema } from './intakeSchema'

describe('exerciseLevelFromActivity', () => {
  it.each([
    ['sedentary', 'beginner'],
    ['light', 'beginner'],
    ['moderate', 'intermediate'],
    ['high', 'advanced'],
  ] as const)('%s → %s', (activity, level) => {
    expect(exerciseLevelFromActivity(activity)).toBe(level)
  })
})

describe('countIntakeAnswers', () => {
  it('broji pitanja iz kolona i neprazne odgovore', () => {
    expect(countIntakeAnswers({})).toBe(9)
    expect(countIntakeAnswers(null)).toBe(9)
    expect(
      countIntakeAnswers({
        fluids: '1_1_5',
        symptoms: [],
        notes: '',
        allergies: false,
        channels: ['email'],
      }),
    ).toBe(9 + 3) // prazna lista i prazan tekst se ne broje, „Ne“ (false) se broji
  })
})

describe('intakeSummary', () => {
  const answers = intakeSchema.parse({
    full_name: 'Ana Marković',
    email: 'ana@primer.rs',
    phone: '+381641234567',
    birth_date: '1992-03-14',
    occupation: 'Ekonomistkinja',
    sex: 'female',
    height_cm: '168',
    weight_kg: '70,5',
    country: 'Srbija',
    diagnoses: 'Insulinska rezistencija',
    symptoms: ['fatigue', 'other'],
    symptoms_other: 'Vrtoglavica',
    allergies: true,
    allergies_text: 'Orasi',
    surgery: false,
    childhood_tonsillitis: 'no',
    pregnancies: '1',
    therapy_current: 'Metformin',
    fluids: '1_1_5',
    activity: 'light',
    stool: 'every_2_3_days',
    bedtime: '23:30',
    sleep_hours: '6_7',
    outdoor_time: 'lt30',
    low_sun_country: 'no',
    work_exposure: ['stress', 'deadlines'],
    disliked_foods: ['liver', 'cabbage'],
    disliked_other: 'Cvekla',
    channels: ['whatsapp'],
    consent_health: true,
    consent_terms: true,
  })

  it('ima 11 redova kao na dizajnu', () => {
    const rows = intakeSummary(answers, '2026-10-13')
    expect(rows.map((r) => r.label)).toEqual([
      'Godine · posao',
      'Dijagnoze',
      'Simptomi',
      'Alergije',
      'Terapija sada',
      'Visina · start',
      'Aktivnost',
      'San · stolica',
      'Tečnost · napolju',
      'Posao',
      'Ne voli',
    ])
  })

  it('popunjava vrednosti iz odgovora', () => {
    const rows = Object.fromEntries(
      intakeSummary(answers, '2026-10-13').map((r) => [r.label, r.value]),
    )
    expect(rows['Godine · posao']).toBe('34 god · Ekonomistkinja')
    expect(rows['Simptomi']).toBe('Umor, Vrtoglavica')
    expect(rows['Alergije']).toBe('Orasi')
    expect(rows['Terapija sada']).toBe('Metformin')
    expect(rows['Visina · start']).toBe('168 cm · 70.5 kg')
    expect(rows['Aktivnost']).toBe('Lagan')
    expect(rows['San · stolica']).toBe('6–7 h · Na 2–3 dana')
    expect(rows['Posao']).toBe('Preteran stres, Rokovi')
    expect(rows['Ne voli']).toBe('Jetra i iznutrice, Prokelj i kupus, Cvekla')
  })
})
