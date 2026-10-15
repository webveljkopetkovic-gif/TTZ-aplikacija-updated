import { describe, expect, it } from 'vitest'
import { findMealRuleViolation, mealViolation } from './mealRules'

describe('pravilo: bez kalorija, grama i vaganja', () => {
  it.each([
    'Ovsena kaša 50 g',
    'Ovsena kaša 50g',
    'jogurt 200 ml',
    'Piletina 150 grama',
    'Ovas 2,5 dag',
    '300 kcal doručak',
    'Obrok ima 400 kalorija',
    'Kalorije po obroku',
    'Izmeri porciju',
    'Izvagaj pirinač',
    'Vaga je obavezna',
    'Makro: proteini 30',
  ])('odbija „%s“', (text) => {
    expect(findMealRuleViolation(text)).not.toBeNull()
  })

  it.each([
    'Jaja i avokado',
    'Ćuretina, heljda, salata',
    'Grčki jogurt sa orasima',
    'Šaka badema',
    'Jedna jabuka',
    'Gulaš sa povrćem',
    'Grašak i boranija',
    'Pilav sa gljivama',
    '',
  ])('prihvata „%s“', (text) => {
    expect(findMealRuleViolation(text)).toBeNull()
  })

  it('proverava i opis i recept i vraća polje', () => {
    expect(mealViolation({ title: 'Jaja', recipe: 'Dodaj 20 g putera' })).toEqual({
      field: 'recipe',
      message: 'Bez grama i mera u gramima',
    })
    expect(mealViolation({ title: 'Jaja', description: null, recipe: undefined })).toBeNull()
  })
})
