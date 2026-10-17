import { describe, expect, it } from 'vitest'
import {
  assistantTools,
  buildSystemPrompt,
  intakeForAssistant,
  mealsFor,
  pickAction,
  type AssistantContext,
} from './assistantPrompt'
import { findRedFlag, findReplyViolation, withDoctorAdvice } from './assistantRules'

describe('crveni simptomi', () => {
  it.each([
    ['Boli me grudi od jutros', 'Bol u grudima'],
    ['Imam bol u grudima kad hodam', 'Bol u grudima'],
    ['Juče sam pala u nesvest', 'Nesvestica'],
    ['Vidim krv u stolici', 'Krvarenje'],
    ['Imam jak bol u stomaku', 'Jak bol'],
    ['Mislim da sam trudna', 'Trudnoća'],
    ['Otekle su mi usne posle doručka', 'Alergijska reakcija'],
    ['Ne mogu da dišem posle treninga', 'Otežano disanje'],
  ])('„%s“ → %s', (text, reason) => {
    expect(findRedFlag(text)).toBe(reason)
  })

  it.each([
    'Mogu li kafu uz doručak?',
    'Ne volim ribu',
    'Kada da uradim krvnu sliku?',
    'Imam blago povišen krvni pritisak, smem li kafu?',
    'Čučanj mi smeta na kolenu',
  ])('„%s“ nije crveni simptom', (text) => {
    expect(findRedFlag(text)).toBeNull()
  })

  it('dodaje savet za lekara samo ako ga odgovor nema', () => {
    expect(withDoctorAdvice('Odmori se.')).toMatch(/lekar/)
    const ok = 'Odmah se javi lekaru.'
    expect(withDoctorAdvice(ok)).toBe(ok)
  })
})

describe('pravila odgovora asistenta', () => {
  it.each([
    'Ručak ima oko 450 kcal.',
    'To je 600 kalorija.',
    'Pojedi 150 g piletine.',
    'Dodaj 200 ml jogurta.',
    'Izvagaj pirinač pre kuvanja.',
    'Odmeri porciju šoljom.',
    'Можеш кафу уз доручак.',
  ])('odbija „%s“', (text) => {
    expect(findReplyViolation(text)).not.toBeNull()
  })

  it.each([
    'U TTZ programu ne brojimo kalorije, pratimo plan obroka.',
    'Može jedna kafa uz doručak, bez šećera.',
    'Popij 2 l vode tokom dana.',
    'Predlog sam poslao Olgici, važi tek kad ga potvrdi.',
  ])('prihvata „%s“', (text) => {
    expect(findReplyViolation(text)).toBeNull()
  })
})

const intake = {
  sex: 'female',
  birth_date: '1992-03-14',
  answers: {
    diagnoses: 'Insulinska rezistencija',
    therapy_current: 'Metformin',
    allergies: true,
    allergies_text: 'Orasi',
    disliked_foods: ['fish'],
    disliked_other: 'Brokoli',
    fluids: '1_1_5',
    stool: 'daily',
    sleep_hours: '6_7',
    notes: 'Lična napomena',
  },
}

const meal = (plan_day: number, slot: 'lunch' | 'dinner', title: string, valid_from_cycle = 1) => ({
  plan_day,
  slot,
  time_of_day: '14:00:00',
  title,
  valid_from_cycle,
})

function context(over: Partial<AssistantContext> = {}): AssistantContext {
  return {
    firstName: 'Ana',
    ...intakeForAssistant(intake, '2026-10-17'),
    planFocus: 'Insulinska rezistencija',
    exerciseLevel: 'beginner',
    withTraining: true,
    day: 3,
    duration: 30,
    planDay: 3,
    cycle: 1,
    mealsToday: [{ slot: 'lunch', time_of_day: '14:00:00', title: 'Riba sa blitvom' }],
    tomorrowPlanDay: 4,
    mealsTomorrow: [],
    supplements: [{ name: 'Vitamin D3', timing: 'uz doručak' }],
    workouts: ['Uvod u pokret'],
    lastTeamReply: null,
    ...over,
  }
}

describe('kontekst asistenta (ANKETA.md sekcija 7)', () => {
  it('uzima samo dozvoljena polja iz ankete', () => {
    const c = intakeForAssistant(intake, '2026-10-17')
    expect(c).toEqual({
      sex: 'female',
      age: 34,
      allergies: 'Orasi',
      disliked: 'Riba, Brokoli',
      fluids: '1–1,5 l',
      stool: 'Da, svaki dan',
      sleep: '6–7 h',
    })
  })

  it('prompt nema dijagnoze, terapiju ni napomene', () => {
    const prompt = buildSystemPrompt(context())
    expect(prompt).not.toContain('Metformin')
    expect(prompt).not.toContain('Lična napomena')
    // fokus plana sme (ANKETA.md 7), dijagnoza iz ankete ne
    expect(prompt).toContain('fokus plana: Insulinska rezistencija')
    expect(prompt).toContain('plan_dan_danas: 3')
    expect(prompt).toContain('Riba sa blitvom')
  })

  it('bez vežbi nema alata ni pominjanja Ognjena', () => {
    const prompt = buildSystemPrompt(context({ withTraining: false }))
    expect(prompt).not.toContain('Ognjen')
    const names = assistantTools(false).map((t) => t.function.name)
    expect(names).toEqual(['propose_meal_swap', 'escalate_to_team'])
    expect(assistantTools(true).map((t) => t.function.name)).toContain('propose_workout_swap')
  })

  it('obrok za dan bira najnoviji krug koji važi (kao planMeals)', () => {
    const meals = [meal(6, 'lunch', 'Piletina'), meal(6, 'lunch', 'Ćuretina', 2), meal(6, 'dinner', 'Supa')]
    expect(mealsFor(meals, 6, 1).map((m) => m.title)).toEqual(['Piletina', 'Supa'])
    expect(mealsFor(meals, 6, 2).map((m) => m.title)).toEqual(['Ćuretina', 'Supa'])
  })

  it('eskalacija ima prednost nad zamenom', () => {
    expect(
      pickAction([
        { type: 'meal_swap', plan_day: 1, slot: 'lunch', title: 'X', reason: '' },
        { type: 'escalation', reason: 'Bol', urgency: 'high' },
      ])?.type,
    ).toBe('escalation')
    expect(pickAction([])).toBeNull()
  })
})
