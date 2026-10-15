import { describe, expect, it } from 'vitest'
import { addDays, belgradeToday, feedbackSchedule } from './schedule'

describe('raspored feedbacka pri aktivaciji', () => {
  it('dani 10, 20, 30 sa due_date = activated_at + due_day − 1', () => {
    expect(feedbackSchedule('2026-10-05', 30)).toEqual([
      { due_day: 10, due_date: '2026-10-14' },
      { due_day: 20, due_date: '2026-10-24' },
      { due_day: 30, due_date: '2026-11-03' },
    ])
  })

  it('prati trajanje programa', () => {
    expect(feedbackSchedule('2026-10-05', 25).map((f) => f.due_day)).toEqual([10, 20])
    expect(feedbackSchedule('2026-10-05', 60).map((f) => f.due_day)).toEqual([
      10, 20, 30, 40, 50, 60,
    ])
    expect(feedbackSchedule('2026-10-05', 9)).toEqual([])
  })

  it('promena vremena (kraj oktobra) ne pomera datume', () => {
    expect(addDays('2026-10-24', 3)).toBe('2026-10-27')
    expect(feedbackSchedule('2026-10-20', 30)[2].due_date).toBe('2026-11-18')
  })

  it('današnji datum je po Beogradu, ne po UTC', () => {
    expect(belgradeToday(new Date('2026-10-14T22:30:00Z'))).toBe('2026-10-15')
    expect(belgradeToday(new Date('2026-10-14T21:30:00Z'))).toBe('2026-10-14')
  })
})

describe('programDayOn (server) je isto što i programDay (klijent)', () => {
  it('isti rezultat za dane pre, na i posle aktivacije', async () => {
    const { programDay } = await import('./programDay')
    const { programDayOn } = await import('./schedule')
    for (const today of ['2026-10-04', '2026-10-05', '2026-10-14', '2026-11-03', '2026-12-31']) {
      expect(programDayOn('2026-10-05', today)).toBe(programDay('2026-10-05', today))
    }
    expect(programDayOn(null, '2026-10-05')).toBe(0)
  })
})
