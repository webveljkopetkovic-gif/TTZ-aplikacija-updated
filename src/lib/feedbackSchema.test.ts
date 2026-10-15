import { describe, expect, it } from 'vitest'
import { feedbackTags, makeFeedbackSchema, needsAttention } from './feedbackSchema'

const valid = {
  general: 4,
  energy_am: 2,
  food_tags: ['heartburn'],
  food_text: 'Posle paradajza u salati za ručak',
  exercise_tags: ['pain_knee'],
  exercise_text: '',
  challenges: 'Uveče posle posla sam jako gladna',
  weight_kg: 68.4,
  waist_cm: 82,
  reply_channels: ['whatsapp', 'email'],
}

describe('feedbackSchema', () => {
  const full = makeFeedbackSchema({ withTraining: true })
  const nutritionOnly = makeFeedbackSchema({ withTraining: false })

  it('prihvata ispravan feedback', () => {
    expect(full.safeParse(valid).success).toBe(true)
  })

  it('traži ocene 1–5 i težinu u opsegu', () => {
    const r = full.safeParse({ ...valid, general: 6, energy_am: 0, weight_kg: 20 })
    expect(r.success).toBe(false)
    const paths = r.success ? [] : r.error.issues.map((i) => i.path[0])
    expect(paths).toEqual(expect.arrayContaining(['general', 'energy_am', 'weight_kg']))
  })

  it('struk je opcion, ali kad je upisan mora biti u opsegu', () => {
    expect(full.safeParse({ ...valid, waist_cm: undefined }).success).toBe(true)
    expect(full.safeParse({ ...valid, waist_cm: 20 }).success).toBe(false)
  })

  it('„Sve OK“ ne ide uz druge odgovore', () => {
    expect(full.safeParse({ ...valid, food_tags: ['all_ok', 'hunger'] }).success).toBe(false)
    expect(full.safeParse({ ...valid, exercise_tags: ['all_ok', 'too_hard'] }).success).toBe(false)
  })

  it('odgovor o vežbama se traži samo uz plan sa vežbama', () => {
    const noExercise = { ...valid, exercise_tags: [] }
    expect(full.safeParse(noExercise).success).toBe(false)
    expect(nutritionOnly.safeParse(noExercise).success).toBe(true)
  })

  it('traži bar jedan kanal za odgovor tima i bar jedan odgovor o hrani', () => {
    expect(full.safeParse({ ...valid, reply_channels: [] }).success).toBe(false)
    expect(full.safeParse({ ...valid, food_tags: [] }).success).toBe(false)
  })
})

describe('tagovi i pažnja tima', () => {
  it('tagovi: hrana zeleno, vežbe crno, pad energije u odnosu na prethodni feedback', () => {
    const tags = feedbackTags(
      { food_tags: ['heartburn'], exercise_tags: ['pain_knee'], energy_am: 2 },
      { energy_am: 4 },
    )
    expect(tags).toEqual([
      { label: 'Gorušica', tone: 'lime' },
      { label: 'Bol u kolenu', tone: 'black' },
      { label: 'Energija ↓', tone: 'gray' },
    ])
  })

  it('„Sve OK“ je neutralan tag', () => {
    expect(feedbackTags({ food_tags: ['all_ok'] })).toEqual([{ label: 'Sve OK', tone: 'gray' }])
  })

  it('bol, loš osećaj ili pad energije traže pažnju; običan feedback ne', () => {
    expect(needsAttention({ exercise_tags: ['pain_knee'], general: 4 })).toBe(true)
    expect(needsAttention({ general: 2, exercise_tags: [] })).toBe(true)
    expect(needsAttention({ general: 4, energy_am: 2 }, { energy_am: 4 })).toBe(true)
    expect(
      needsAttention({ general: 4, energy_am: 4, exercise_tags: ['all_ok'] }, { energy_am: 4 }),
    ).toBe(false)
    expect(needsAttention(null)).toBe(false)
  })
})
