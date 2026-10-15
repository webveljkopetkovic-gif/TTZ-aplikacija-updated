import { describe, expect, it } from 'vitest'
import { step5Schema, step6Schema, step7Schema, step8Schema, step9Schema } from './intakeSchema'
import {
  bmiCategory,
  calcBmi,
  MAX_TRAINING_SCORE,
  needsDoctorNotice,
  safetyFlags,
  suggestedLevel,
  trainingScore,
} from './trainingSchema'

const beginner = {
  goals: ['fat_loss'],
  place: 'home',
  doctor_limit: 'no',
  chest_pain: 'no',
  injury: 'no',
  medical_restriction: 'no',
  train_duration: 'never',
  train_frequency: 'none',
  technique: 'none',
  long_break: 'yes',
  chair_stands: 'lt10',
  pushups_knees: 'lt5',
  pushups_feet: 'cant',
  plank_knees: 'unknown',
  plank_feet: 'unknown',
  single_leg: 'not_tried',
  movement_pain: 'no',
  stairs: 'must_stop',
  cardio_duration: 'lt10',
  recovery: 'gt3d',
} as const

const strong = {
  ...beginner,
  train_duration: 'gt3y',
  train_frequency: '5plus',
  technique: 'very_good',
  long_break: 'no',
  chair_stands: '30plus',
  pushups_knees: 'gt20',
  pushups_feet: 'gt20',
  plank_knees: '90plus',
  plank_feet: '90plus',
  single_leg: 'stable',
  stairs: 'easy',
  cardio_duration: 'gt40',
  recovery: '24_48h',
} as const

describe('BMI', () => {
  it('računa kg / m² na jednu decimalu', () => {
    expect(calcBmi(170, 70)).toBe(24.2)
    expect(calcBmi(180, 100)).toBe(30.9)
  })

  it('vraća null za neispravan ulaz', () => {
    expect(calcBmi(0, 70)).toBeNull()
    expect(calcBmi(170, Number.NaN)).toBeNull()
  })

  it('razvrstava po tabeli za odrasle, uključujući granice', () => {
    expect(bmiCategory(18.4).label).toBe('Pothranjenost')
    expect(bmiCategory(18.5).label).toBe('Normalna telesna masa')
    expect(bmiCategory(24.9).label).toBe('Normalna telesna masa')
    expect(bmiCategory(25).label).toBe('Prekomerna telesna masa')
    expect(bmiCategory(30).label).toBe('Gojaznost I stepena')
    expect(bmiCategory(35).label).toBe('Gojaznost II stepena')
    expect(bmiCategory(40).label).toBe('Gojaznost III stepena')
  })
})

describe('validacija koraka', () => {
  it('korak 5: bar jedan cilj i mesto treninga', () => {
    expect(step5Schema.safeParse(beginner).success).toBe(true)
    expect(step5Schema.safeParse({ ...beginner, goals: [] }).success).toBe(false)
    expect(step5Schema.safeParse({ ...beginner, place: undefined }).success).toBe(false)
  })

  it('korak 6: razlog je obavezan samo kad je odgovor Da', () => {
    expect(step6Schema.safeParse({ ...beginner, doctor_limit: 'yes' }).success).toBe(false)
    expect(
      step6Schema.safeParse({ ...beginner, doctor_limit: 'yes', doctor_limit_reason: 'Srce' })
        .success,
    ).toBe(true)
    expect(step6Schema.safeParse({ ...beginner, medical_restriction: 'yes' }).success).toBe(false)
    expect(step6Schema.safeParse({ ...beginner, medical_restriction: 'unsure' }).success).toBe(true)
  })

  it('koraci 5–9 odbijaju prazan unos, a ispravan prolaze', () => {
    for (const schema of [step5Schema, step6Schema, step7Schema, step8Schema, step9Schema]) {
      expect(schema.safeParse({}).success).toBe(false)
      expect(schema.safeParse(beginner).success).toBe(true)
    }
  })
})

describe('bezbednost', () => {
  it('bez oznaka kad su svi odgovori Ne', () => {
    expect(safetyFlags(beginner)).toEqual([])
    expect(needsDoctorNotice(beginner)).toBe(false)
  })

  it('bol u grudima i ograničenje lekara traže savet lekara', () => {
    expect(needsDoctorNotice({ ...beginner, chest_pain: 'yes' })).toBe(true)
    expect(needsDoctorNotice({ ...beginner, doctor_limit: 'yes' })).toBe(true)
    expect(needsDoctorNotice({ ...beginner, injury: 'yes' })).toBe(false)
  })

  it('povreda, ograničenje i bol u pokretu su oznake za trenera', () => {
    expect(safetyFlags({ ...beginner, injury: 'yes' })).toHaveLength(1)
    expect(safetyFlags({ ...beginner, medical_restriction: 'yes' })).toHaveLength(1)
    expect(safetyFlags({ ...beginner, movement_pain: 'sometimes' })).toHaveLength(1)
  })
})

describe('predlog nivoa', () => {
  it('bodovi su između 0 i maksimuma', () => {
    expect(trainingScore(beginner)).toBe(0)
    expect(trainingScore(strong)).toBe(MAX_TRAINING_SCORE)
  })

  it('početnik, srednji i napredni', () => {
    expect(suggestedLevel(beginner)).toBe('beginner')
    expect(suggestedLevel(strong)).toBe('advanced')
    expect(
      suggestedLevel({
        ...beginner,
        train_duration: '3_12m',
        train_frequency: '1_2',
        technique: 'some',
        long_break: 'no',
        chair_stands: '10_19',
        pushups_knees: '10_15',
        plank_knees: '20_44',
        single_leg: 'difficult',
        stairs: 'very_breathless',
        cardio_duration: '10_20',
        recovery: '24_48h',
      }),
    ).toBe('intermediate')
  })

  it('bezbednosna oznaka uvek daje početni nivo', () => {
    expect(suggestedLevel({ ...strong, injury: 'yes' })).toBe('beginner')
  })

  it('„Ne mogu“ na sklekovima sa stopala se računa preko sklekova na kolena', () => {
    const withKnees = trainingScore({ ...beginner, long_break: 'no', pushups_knees: 'gt20' })
    expect(withKnees).toBe(2)
  })
})
