import { describe, expect, it } from 'vitest'
import {
  belgradeDate,
  daysLeft,
  isFeedbackDay,
  isoWeekday,
  isTrainingDay,
  nextFeedbackDay,
  planCycle,
  planDay,
  programDay,
  programPhase,
} from './programDay'

/** Dan programa kad je Dan 1 = 2026-01-05 (ponedeljak), a „danas“ je zadati dan. */
const dayOn = (today: string) => programDay('2026-01-05', today)
/** Datum koji je `n` dana posle Dana 1. */
const dateAt = (n: number) => {
  const d = new Date(Date.UTC(2026, 0, 5 + n))
  return d.toISOString().slice(0, 10)
}

describe('programDay', () => {
  it('je 0 dok program nije aktiviran', () => {
    expect(programDay(null, '2026-01-05')).toBe(0)
    expect(programDay(undefined, '2026-01-05')).toBe(0)
  })

  it('je 0 ako je aktivacija u budućnosti', () => {
    expect(programDay('2026-01-10', '2026-01-05')).toBe(0)
  })

  it.each([
    [0, 1],
    [13, 14],
    [14, 15],
    [27, 28],
    [28, 29],
    [29, 30],
    [30, 31],
  ])('%i dana posle aktivacije je dan %i', (offset, expected) => {
    expect(dayOn(dateAt(offset))).toBe(expected)
  })

  it('izračunava dan kroz prelazak na letnje vreme (29. 3. 2026)', () => {
    expect(programDay('2026-03-28', '2026-03-29')).toBe(2)
    expect(programDay('2026-03-28', '2026-03-30')).toBe(3)
    expect(programDay('2026-03-20', '2026-04-05')).toBe(17)
  })

  it('izračunava dan kroz prelazak na zimsko vreme (25. 10. 2026)', () => {
    expect(programDay('2026-10-24', '2026-10-25')).toBe(2)
    expect(programDay('2026-10-24', '2026-10-26')).toBe(3)
    expect(programDay('2026-10-15', '2026-11-13')).toBe(30)
  })

  it('prima trenutak i računa po Beogradu', () => {
    expect(programDay('2026-06-15', new Date('2026-06-15T10:00:00Z'))).toBe(1)
  })
})

describe('belgradeDate (ponoć po Beogradu)', () => {
  it('leti (UTC+2) 22:00 UTC je već sledeći dan', () => {
    expect(belgradeDate(new Date('2026-06-15T21:59:59Z'))).toBe('2026-06-15')
    expect(belgradeDate(new Date('2026-06-15T22:00:00Z'))).toBe('2026-06-16')
  })

  it('zimi (UTC+1) 23:00 UTC je već sledeći dan', () => {
    expect(belgradeDate(new Date('2026-01-15T22:59:59Z'))).toBe('2026-01-15')
    expect(belgradeDate(new Date('2026-01-15T23:00:00Z'))).toBe('2026-01-16')
  })

  it('dan se menja u ponoć po Beogradu i na dan prelaska na letnje vreme', () => {
    expect(belgradeDate(new Date('2026-03-28T22:59:59Z'))).toBe('2026-03-28')
    expect(belgradeDate(new Date('2026-03-28T23:00:00Z'))).toBe('2026-03-29')
    // posle prelaska (UTC+2): ponoć je u 22:00 UTC
    expect(belgradeDate(new Date('2026-03-29T21:59:59Z'))).toBe('2026-03-29')
    expect(belgradeDate(new Date('2026-03-29T22:00:00Z'))).toBe('2026-03-30')
  })

  it('dan se menja u ponoć po Beogradu na dan prelaska na zimsko vreme', () => {
    expect(belgradeDate(new Date('2026-10-24T21:59:59Z'))).toBe('2026-10-24')
    expect(belgradeDate(new Date('2026-10-24T22:00:00Z'))).toBe('2026-10-25')
    // posle prelaska (UTC+1): ponoć je u 23:00 UTC
    expect(belgradeDate(new Date('2026-10-25T22:59:59Z'))).toBe('2026-10-25')
    expect(belgradeDate(new Date('2026-10-25T23:00:00Z'))).toBe('2026-10-26')
  })

  it('program aktiviran uveče po Beogradu ima Dan 1 taj dan, a Dan 2 posle ponoći', () => {
    const activated = belgradeDate(new Date('2026-06-15T20:30:00Z')) // 22:30 u Beogradu
    expect(activated).toBe('2026-06-15')
    expect(programDay(activated, new Date('2026-06-15T21:59:00Z'))).toBe(1)
    expect(programDay(activated, new Date('2026-06-15T22:00:00Z'))).toBe(2)
  })
})

describe('planDay i planCycle', () => {
  it('su 0 pre Dana 1', () => {
    expect(planDay(0)).toBe(0)
    expect(planCycle(0)).toBe(0)
  })

  it.each([
    [1, 1, 1],
    [14, 14, 1],
    [15, 1, 2],
    [20, 6, 2],
    [28, 14, 2],
    [29, 1, 3],
    [30, 2, 3],
    [31, 3, 3],
  ])('dan %i: plan dan %i, krug %i', (day, expectedPlanDay, expectedCycle) => {
    expect(planDay(day)).toBe(expectedPlanDay)
    expect(planCycle(day)).toBe(expectedCycle)
  })
})

describe('feedback dani', () => {
  it('isFeedbackDay: samo 10, 20, 30', () => {
    const days = Array.from({ length: 35 }, (_, i) => i).filter((d) => isFeedbackDay(d))
    expect(days).toEqual([10, 20, 30])
  })

  it('isFeedbackDay poštuje trajanje programa', () => {
    expect(isFeedbackDay(30, 20)).toBe(false)
    expect(isFeedbackDay(20, 20)).toBe(true)
    expect(isFeedbackDay(60, 60)).toBe(true)
  })

  it('nextFeedbackDay', () => {
    expect(nextFeedbackDay(0)).toBe(10)
    expect(nextFeedbackDay(1)).toBe(10)
    expect(nextFeedbackDay(10)).toBe(10)
    expect(nextFeedbackDay(11)).toBe(20)
    expect(nextFeedbackDay(30)).toBe(30)
    expect(nextFeedbackDay(31)).toBeNull()
    expect(nextFeedbackDay(25, 20)).toBeNull()
  })
})

describe('isTrainingDay i isoWeekday', () => {
  it('ISO dan u nedelji: 1 = ponedeljak, 7 = nedelja', () => {
    expect(isoWeekday('2026-01-05')).toBe(1)
    expect(isoWeekday('2026-01-11')).toBe(7)
  })

  it('trening pon, sre, pet', () => {
    const weekdays = [1, 3, 5]
    expect(isTrainingDay('2026-01-05', weekdays)).toBe(true) // pon
    expect(isTrainingDay('2026-01-06', weekdays)).toBe(false) // uto
    expect(isTrainingDay('2026-01-07', weekdays)).toBe(true) // sre
    expect(isTrainingDay('2026-01-10', weekdays)).toBe(false) // sub
  })

  it('trenutak se računa po Beogradu', () => {
    // 23:30 UTC u nedelju je već ponedeljak u Beogradu
    expect(isTrainingDay(new Date('2026-01-11T23:30:00Z'), [1])).toBe(true)
  })
})

describe('daysLeft', () => {
  it('broji do kraja programa', () => {
    expect(daysLeft(1)).toBe(29)
    expect(daysLeft(30)).toBe(0)
    expect(daysLeft(31)).toBe(0)
    expect(daysLeft(0)).toBe(30)
    expect(daysLeft(10, 60)).toBe(50)
  })
})

describe('programPhase', () => {
  it('pre dana 1 je „before“, do dana 27 „active“', () => {
    expect(programPhase(0)).toBe('before')
    expect(programPhase(1)).toBe('active')
    expect(programPhase(27)).toBe('active')
  })

  it('dani 28–30 su „ending“ (ponuda nastavka)', () => {
    expect(programPhase(28)).toBe('ending')
    expect(programPhase(30)).toBe('ending')
  })

  it('31–60 je samo čitanje, posle toga istekao', () => {
    expect(programPhase(31)).toBe('read_only')
    expect(programPhase(60)).toBe('read_only')
    expect(programPhase(61)).toBe('expired')
  })

  it('prati trajanje programa', () => {
    expect(programPhase(58, 60)).toBe('ending')
    expect(programPhase(61, 60)).toBe('read_only')
  })
})
