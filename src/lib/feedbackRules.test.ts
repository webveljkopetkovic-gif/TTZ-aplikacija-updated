import { describe, expect, it } from 'vitest'
import {
  belgradeInstant,
  feedbackActions,
  programActions,
  type FeedbackRow,
  type ProgramRow,
} from './feedbackRules'

const row = (over: Partial<FeedbackRow> = {}): FeedbackRow => ({
  id: 'f1',
  program_id: 'p1',
  due_day: 10,
  due_date: '2026-10-14',
  status: 'scheduled',
  reminder_count: 0,
  ...over,
})

const types = (r: FeedbackRow, iso: string) => feedbackActions(r, new Date(iso)).map((a) => a.type)

describe('belgradeInstant', () => {
  it('09:00 u Beogradu je 07:00 UTC leti, a 08:00 UTC zimi', () => {
    expect(belgradeInstant('2026-10-14', 9).toISOString()).toBe('2026-10-14T07:00:00.000Z')
    expect(belgradeInstant('2026-11-18', 9).toISOString()).toBe('2026-11-18T08:00:00.000Z')
  })

  it('dan promene vremena (25. 10. 2026) koristi zimski pomak posle 03:00', () => {
    expect(belgradeInstant('2026-10-25', 9).toISOString()).toBe('2026-10-25T08:00:00.000Z')
    expect(belgradeInstant('2026-03-29', 9).toISOString()).toBe('2026-03-29T07:00:00.000Z')
  })
})

describe('scheduler: feedback dan 10 (due_date 14. 10. 2026, otvaranje 07:00 UTC)', () => {
  it('u 08:59 po Beogradu još ništa', () => {
    expect(types(row(), '2026-10-14T06:59:00Z')).toEqual([])
  })

  it('u 09:00 otvara feedback', () => {
    expect(types(row(), '2026-10-14T07:00:00Z')).toEqual(['open'])
  })

  it('otvoren feedback do 24 h nema podsetnik', () => {
    expect(types(row({ status: 'open' }), '2026-10-15T06:59:00Z')).toEqual([])
  })

  it('posle 24 h šalje jedan podsetnik', () => {
    expect(types(row({ status: 'open' }), '2026-10-15T07:00:00Z')).toEqual(['remind'])
    expect(types(row({ status: 'open', reminder_count: 1 }), '2026-10-15T20:00:00Z')).toEqual([])
  })

  it('posle 48 h je „late“ (bez novog podsetnika)', () => {
    expect(types(row({ status: 'open', reminder_count: 1 }), '2026-10-16T07:00:00Z')).toEqual([
      'late',
    ])
    expect(types(row({ status: 'open' }), '2026-10-16T07:00:00Z')).toEqual(['late'])
  })

  it('zakasnela provera nadoknađuje: otvara i odmah označava kao late, bez podsetnika', () => {
    expect(types(row(), '2026-10-17T10:00:00Z')).toEqual(['open', 'late'])
  })

  it('poslat, zakasneo i odgovoren feedback se ne dira', () => {
    for (const status of ['submitted', 'late', 'answered'] as const) {
      expect(types(row({ status }), '2026-10-20T10:00:00Z')).toEqual([])
    }
  })
})

describe('scheduler: kraj programa', () => {
  const program = (over: Partial<ProgramRow> = {}): ProgramRow => ({
    id: 'p1',
    status: 'active',
    activated_at: '2026-10-05',
    duration_days: 30,
    ...over,
  })
  const run = (p: ProgramRow, iso: string) => programActions(p, new Date(iso)).map((a) => a.type)

  it('najava stiže na dan 28 u 09:00 (2026-11-01), ne ranije', () => {
    expect(run(program(), '2026-11-01T07:59:00Z')).toEqual([]) // 08:59 po Beogradu (zima)
    expect(run(program(), '2026-11-01T08:00:00Z')).toEqual(['announce_end'])
    expect(run(program(), '2026-11-03T08:00:00Z')).toEqual(['announce_end'])
  })

  it('posle poslednjeg dana (dan 30 = 3. 11.) program prelazi u ended', () => {
    expect(run(program(), '2026-11-03T22:59:00Z')).toEqual(['announce_end']) // još 3. 11. u Beogradu
    expect(run(program(), '2026-11-03T23:00:00Z')).toEqual(['end'])
  })

  it('neaktivan program se ne dira', () => {
    expect(run(program({ status: 'ready', activated_at: null }), '2026-11-05T10:00:00Z')).toEqual(
      [],
    )
    expect(run(program({ status: 'ended' }), '2026-11-05T10:00:00Z')).toEqual([])
  })
})
