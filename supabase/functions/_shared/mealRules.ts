/**
 * Pravilo domena: NIKAD kalorije, grami ni vaganje hrane (CLAUDE.md). Koristi ga forma tima, a
 * Edge Function `publish-plan` ponovo proverava ceo plan pre slanja. Bez zavisnosti.
 */

const FORBIDDEN: readonly { pattern: RegExp; message: string }[] = [
  { pattern: /kcal|kalori|\bcal\b|\bkj\b/iu, message: 'Bez kalorija' },
  { pattern: /makro|proteina?\s+\d|ugljen\w*\s+hidrat\w*\s+\d/iu, message: 'Bez makronutrijenata' },
  { pattern: /\d+[.,]?\d*\s*(g|gr|gram\w*|dag|dkg|kg|mg|ml)(?![\p{L}\d])/iu, message: 'Bez grama i mera u gramima' },
  { pattern: /vagan|vagu|izvag|vagaj|izmeri|izmerite|odmeri|odmerite|\bvaga\b/iu, message: 'Bez vaganja hrane' },
]

/** Prva povreda pravila u tekstu obroka (naslov, opis, recept) ili null ako je tekst u redu. */
export function findMealRuleViolation(text: string | null | undefined): string | null {
  if (!text) return null
  for (const rule of FORBIDDEN) if (rule.pattern.test(text)) return rule.message
  return null
}

/** Povreda pravila u bilo kom od polja obroka, sa nazivom polja za poruku. */
export function mealViolation(meal: {
  title?: string | null
  description?: string | null
  recipe?: string | null
}): { field: 'title' | 'description' | 'recipe'; message: string } | null {
  for (const field of ['title', 'description', 'recipe'] as const) {
    const message = findMealRuleViolation(meal[field])
    if (message) return { field, message }
  }
  return null
}
