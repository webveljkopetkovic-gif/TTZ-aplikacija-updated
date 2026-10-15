import { describe, expect, it } from 'vitest'
import {
  change,
  formatChange,
  pluralSr,
  resultsSummary,
  wrapText,
  type ProgramResults,
} from './programResults'

const results = (over: Partial<ProgramResults> = {}): ProgramResults => ({
  duration_days: 30,
  start_weight_kg: 70.5,
  end_weight_kg: 67.6,
  start_waist_cm: 82,
  end_waist_cm: 78,
  followed_days: 27,
  workouts_done: 13,
  feedbacks_done: 3,
  full_cycles: 2,
  ...over,
})

describe('change i formatChange', () => {
  it('razlika zaokružena na jednu decimalu, bez grešaka plutajućeg zareza', () => {
    expect(change(70.5, 67.6)).toBe(-2.9)
    expect(change(81.5, 80.2)).toBe(-1.3)
    expect(change(82, 78)).toBe(-4)
  })

  it('nedostajuće merenje daje null i crticu', () => {
    expect(change(70, null)).toBeNull()
    expect(change(undefined, 70)).toBeNull()
    expect(formatChange(null, 'kg')).toBe('—')
  })

  it('prikaz sa pravim minusom i decimalnim zarezom', () => {
    expect(formatChange(-2.9, 'kg')).toBe('−2,9 kg')
    expect(formatChange(-4, 'cm')).toBe('−4 cm')
    expect(formatChange(0.4, 'kg')).toBe('+0,4 kg')
    expect(formatChange(0, 'kg')).toBe('0 kg')
  })
})

describe('pluralSr', () => {
  it('1 · 2–4 · 5+ i izuzeci 11–14', () => {
    expect(pluralSr(1, 'krug', 'kruga', 'krugova')).toBe('1 krug')
    expect(pluralSr(2, 'krug', 'kruga', 'krugova')).toBe('2 kruga')
    expect(pluralSr(5, 'krug', 'kruga', 'krugova')).toBe('5 krugova')
    expect(pluralSr(11, 'trening', 'treninga', 'treninga')).toBe('11 treninga')
    expect(pluralSr(21, 'krug', 'kruga', 'krugova')).toBe('21 krug')
    expect(pluralSr(0, 'krug', 'kruga', 'krugova')).toBe('0 krugova')
  })
})

describe('resultsSummary', () => {
  it('sa vežbama: feedbacki, krugovi i treninzi', () => {
    expect(resultsSummary(results(), true)).toBe('3 feedbacka, 2 kruga plana i 13 treninga.')
  })

  it('bez vežbi nema treninga', () => {
    expect(resultsSummary(results(), false)).toBe('3 feedbacka i 2 kruga plana.')
  })
})

describe('wrapText', () => {
  const measure = (s: string) => s.length * 10
  it('prelama po širini i čuva nove redove', () => {
    expect(wrapText('jedan dva tri četiri', measure, 100)).toEqual(['jedan dva', 'tri četiri'])
    expect(wrapText('a\n\nb', measure, 500)).toEqual(['a', '', 'b'])
  })

  it('predugačka reč ostaje cela u svom redu', () => {
    expect(wrapText('nastavak neprekidnogizuzetnodugačkareč', measure, 100)).toEqual([
      'nastavak',
      'neprekidnogizuzetnodugačkareč',
    ])
  })
})
