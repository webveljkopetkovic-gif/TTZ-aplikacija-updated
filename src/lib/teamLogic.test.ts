import { describe, expect, it } from 'vitest'
import { dislikedWords, matchDisliked } from './dislikes'
import { answerCount, dossierSummary, trainingView } from './dossierView'
import { countOverview, defaultView, forView, greeting, statusOf } from './teamStatus'

describe('statusi tima', () => {
  const rows = [
    { team_status: 'feedback_in', product_kind: 'nutrition', pending_review_count: 1 },
    { team_status: 'late', product_kind: 'nutrition_training', pending_review_count: 0 },
    { team_status: 'new_plan', product_kind: 'nutrition_training', pending_review_count: 2 },
    { team_status: 'active', product_kind: 'nutrition', pending_review_count: null },
  ]

  it('broji feedback, kasne, nove planove i poruke za potvrdu', () => {
    expect(countOverview(rows)).toEqual({ feedback: 1, late: 1, newPlans: 1, pendingReview: 3 })
  })

  it('Ognjen vidi samo klijente sa vežbama, Olgica i ceo tim sve', () => {
    expect(forView(rows, 'ognjen')).toHaveLength(2)
    expect(forView(rows, 'olgica')).toHaveLength(4)
    expect(forView(rows, 'all')).toHaveLength(4)
  })

  it('podrazumevani prekidač po ulozi', () => {
    expect(defaultView('nutritionist')).toBe('olgica')
    expect(defaultView('trainer')).toBe('ognjen')
    expect(defaultView('admin')).toBe('all')
  })

  it('oznake statusa i nepoznat status', () => {
    expect(statusOf('late')).toEqual({ label: 'KASNI', tone: 'danger' })
    expect(statusOf('new_plan').label).toBe('NOV PLAN')
    expect(statusOf('nešto-drugo').label).toBe('AKTIVAN')
  })

  it('pozdrav po dobu dana u Beogradu', () => {
    expect(greeting(new Date('2026-10-15T06:00:00Z'))).toBe('Dobro jutro') // 08:00
    expect(greeting(new Date('2026-10-15T11:00:00Z'))).toBe('Dobar dan') // 13:00
    expect(greeting(new Date('2026-10-15T19:00:00Z'))).toBe('Dobro veče') // 21:00
  })
})

describe('upozorenje „ne voli“ u izradi plana', () => {
  const words = dislikedWords(['fish', 'legumes'], 'Cvekla, celer')

  it('prepoznaje obrok sa hranom koju klijent ne voli', () => {
    expect(matchDisliked({ title: 'Riba sa blitvom' }, words)).toBe('riba')
    expect(matchDisliked({ title: 'Čorba od sočiva i salata' }, words)).toBe('sočiv')
    expect(matchDisliked({ title: 'Salata', recipe: 'dodaj celer' }, words)).toBe('celer')
  })

  it('ne označava obrok koji je u redu', () => {
    expect(matchDisliked({ title: 'Ćuretina, heljda, salata' }, words)).toBeNull()
  })
})

describe('prikaz ankete u dosijeu', () => {
  const row = {
    full_name: 'Ana Marković',
    birth_date: '1992-03-14',
    occupation: 'Ekonomistkinja',
    height_cm: 168,
    start_weight_kg: 70.5,
    activity_level: 'light',
    answers: {
      diagnoses: 'Insulinska rezistencija',
      symptoms: ['fatigue', 'bloating'],
      allergies: false,
      fluids: '1_1_5',
      stool: 'Na 2–3 dana', // stariji zapis sa labelom
      sleep_hours: '6_7',
      outdoor_time: 'lt30',
      work_exposure: ['sitting_all_day'],
      disliked_foods: ['liver', 'cabbage'],
    },
  }

  it('ima 11 redova i čita i ključeve i stare labele', () => {
    const rows = dossierSummary(row, '2026-10-15')
    expect(rows).toHaveLength(11)
    expect(rows[0].value).toBe('34 god · Ekonomistkinja')
    expect(rows.find((r) => r.label === 'Simptomi')?.value).toBe('Umor, Nadutost')
    expect(rows.find((r) => r.label === 'Alergije')?.value).toBe('Nema')
    expect(rows.find((r) => r.label === 'San · stolica')?.value).toBe('6–7 h · Na 2–3 dana')
    expect(rows.find((r) => r.label === 'Ne voli')?.value).toBe(
      'Jetra i iznutrice, Prokelj i kupus',
    )
  })

  it('Ognjenovi odgovori: stariji zapis ih nema, noviji daje oznake i predlog nivoa', () => {
    expect(trainingView(row.answers).answered).toBe(false)
    const view = trainingView({
      place: 'home',
      train_duration: 'never',
      chest_pain: 'yes',
      injury: 'no',
    })
    expect(view.answered).toBe(true)
    expect(view.flags).toEqual(['Bol u grudima, nesvestica ili gušenje tokom aktivnosti'])
    expect(view.suggested).toBe('beginner')
  })

  it('broji odgovore', () => {
    expect(answerCount({})).toBe(9)
    expect(answerCount({ a: 'x', b: '', c: [], d: false })).toBe(11)
  })
})
