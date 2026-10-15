/**
 * Upozorenje u izradi plana (ANKETA.md sekcija 6): ako obrok sadrži nešto sa liste „ne voli“ ili
 * alergija klijenta (prosto poređenje reči), označi ga da ga Olgica zameni.
 */

const KEYWORDS: Record<string, string[]> = {
  fish: ['riba', 'ribe', 'ribu', 'ribi', 'tunjevin', 'losos', 'skuš', 'sardin', 'bakalar'],
  liver: ['jetra', 'jetre', 'jetru', 'iznutric', 'džigeric', 'dzigeric'],
  milk: ['mleko', 'mleka', 'mlekom'],
  eggs: ['jaja', 'jaje', 'jaji', 'omlet', 'kajgana', 'kajgan'],
  mushrooms: ['pečurk', 'pecurk', 'gljiv'],
  cabbage: ['prokelj', 'kupus', 'kelj'],
  legumes: [
    'mahunark',
    'sočiv',
    'socivo',
    'leblebij',
    'pasulj',
    'boranij',
    'grašak',
    'grasak',
    'sočiva',
  ],
}

const normalize = (s: string) => s.toLowerCase()

/** Reči koje treba tražiti u obroku za izabrane vrednosti „ne voli“ i slobodan tekst. */
export function dislikedWords(disliked: readonly string[], other: string | undefined): string[] {
  const words = disliked.flatMap((v) => KEYWORDS[v] ?? [])
  const free = (other ?? '')
    .split(/[,;\n]/)
    .map((w) => normalize(w.trim()))
    .filter((w) => w.length >= 3)
  return [...words, ...free]
}

/** Prva reč sa liste koja se nalazi u tekstu obroka, ili null. */
export function matchDisliked(
  meal: { title?: string | null; description?: string | null; recipe?: string | null },
  words: readonly string[],
): string | null {
  const text = normalize(`${meal.title ?? ''} ${meal.description ?? ''} ${meal.recipe ?? ''}`)
  return words.find((w) => text.includes(w)) ?? null
}
