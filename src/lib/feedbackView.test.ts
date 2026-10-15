import { describe, expect, it } from 'vitest'
import {
  feedbackKicker,
  feedbackTitle,
  heroState,
  relativeDay,
  replyCountdown,
  statusLabel,
} from './feedbackView'

const f = (due_day: number, status: string, submitted_at: string | null = null) => ({
  id: `f${due_day}`,
  due_day,
  status,
  submitted_at,
})
const three = (a: string, b: string, c: string) => [f(10, a), f(20, b), f(30, c)]

describe('heroState', () => {
  it('pre dana 10: sledeći feedback sa odbrojavanjem', () => {
    const h = heroState(three('scheduled', 'scheduled', 'scheduled'), 1)
    expect(h).toMatchObject({ kind: 'upcoming', daysLeft: 9 })
    expect(h.kind === 'upcoming' && h.feedback.due_day).toBe(10)
  })

  it('otvoren ili zakasneo feedback je glavno (popuni)', () => {
    expect(heroState(three('open', 'scheduled', 'scheduled'), 10).kind).toBe('open')
    expect(heroState(three('late', 'scheduled', 'scheduled'), 12).kind).toBe('open')
  })

  it('poslat feedback čeka odgovor tima', () => {
    expect(heroState(three('submitted', 'scheduled', 'scheduled'), 11).kind).toBe('waiting')
  })

  it('sveže odgovoren feedback se vidi 3 dana, pa na red dolazi sledeći', () => {
    expect(heroState(three('answered', 'scheduled', 'scheduled'), 12).kind).toBe('answered')
    expect(heroState(three('answered', 'scheduled', 'scheduled'), 14).kind).toBe('upcoming')
  })

  it('posle završnog feedbacka ostaje poslednji odgovor', () => {
    expect(heroState(three('answered', 'answered', 'answered'), 40).kind).toBe('answered')
  })

  it('nema feedbacka: none', () => {
    expect(heroState([], 1).kind).toBe('none')
  })
})

describe('nazivi i oznake', () => {
  const all = [{ due_day: 10 }, { due_day: 20 }, { due_day: 30 }]
  it('prvi, drugi i završni feedback', () => {
    expect(feedbackTitle(10, all)).toBe('Dan 10 · prvi feedback')
    expect(feedbackTitle(20, all)).toBe('Dan 20 · drugi feedback')
    expect(feedbackTitle(30, all)).toBe('Dan 30 · završni')
    expect(feedbackKicker(10, all)).toBe('PRVI FEEDBACK · DAN 10')
  })

  it('statusLabel: odbrojavanje, otvoren, kasni, poslato, odgovoreno', () => {
    expect(statusLabel('scheduled', 9)).toBe('za 9 dana')
    expect(statusLabel('scheduled', 1)).toBe('za 1 dan')
    expect(statusLabel('open', 0)).toBe('Otvoren')
    expect(statusLabel('late', -2)).toBe('Kasni')
    expect(statusLabel('submitted', 0)).toBe('Poslato')
    expect(statusLabel('answered', 0)).toBe('Odgovoreno')
  })
})

describe('rok tima od 48 h', () => {
  const sent = '2026-10-14T10:00:00Z'
  it('odbrojava sate do roka', () => {
    expect(replyCountdown(sent, new Date('2026-10-15T10:00:00Z'))).toEqual({
      overdue: false,
      hours: 24,
    })
  })
  it('posle 48 h je prekoračen', () => {
    expect(replyCountdown(sent, new Date('2026-10-16T13:00:00Z'))).toEqual({
      overdue: true,
      hours: 3,
    })
  })
  it('bez slanja nema roka', () => {
    expect(replyCountdown(null)).toBeNull()
  })
})

describe('relativeDay', () => {
  const now = new Date('2026-10-15T12:00:00Z')
  it('danas, juče, pre N dana po Beogradu', () => {
    expect(relativeDay('2026-10-15T05:00:00Z', now)).toBe('danas')
    expect(relativeDay('2026-10-14T22:30:00Z', now)).toBe('danas') // 00:30 15. u Beogradu
    expect(relativeDay('2026-10-14T10:00:00Z', now)).toBe('juče')
    expect(relativeDay('2026-10-12T10:00:00Z', now)).toBe('pre 3 d')
  })
})
