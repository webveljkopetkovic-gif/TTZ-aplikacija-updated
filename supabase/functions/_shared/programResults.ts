/** Rezultati programa (SQL funkcija program_results) i njihov prikaz: ekran klijenta, tim i PDF izveštaj. */

export type ProgramResults = {
  duration_days: number
  start_weight_kg: number | null
  end_weight_kg: number | null
  start_waist_cm: number | null
  end_waist_cm: number | null
  followed_days: number
  workouts_done: number
  feedbacks_done: number
  full_cycles: number
}

/** Razlika dva merenja zaokružena na jednu decimalu; null ako nedostaje bilo koje. */
export function change(start: number | null | undefined, end: number | null | undefined): number | null {
  if (typeof start !== 'number' || typeof end !== 'number') return null
  return Math.round((Number(end) - Number(start)) * 10) / 10
}

/** „−2,9 kg“, „+0,4 kg“, „0 kg“, a bez podatka „—“. Minus je pravi znak (−), zarez decimalni. */
export function formatChange(delta: number | null, unit: string): string {
  if (delta === null) return '—'
  if (delta === 0) return `0 ${unit}`
  const sign = delta < 0 ? '−' : '+'
  const value = Number.isInteger(delta) ? String(Math.abs(delta)) : Math.abs(delta).toFixed(1).replace('.', ',')
  return `${sign}${value} ${unit}`
}

/** Srpska množina: 1 krug · 2–4 kruga · 5+ krugova (11–14 uvek treći oblik). */
export function pluralSr(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  const form = mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many
  return `${n} ${form}`
}

/** „3 feedbacka, 2 kruga plana i 13 treninga.“ (treninzi samo za plan sa vežbama). */
export function resultsSummary(r: ProgramResults, withTraining: boolean): string {
  const parts = [
    pluralSr(r.feedbacks_done, 'feedback', 'feedbacka', 'feedbacka'),
    `${pluralSr(r.full_cycles, 'krug', 'kruga', 'krugova')} plana`,
    ...(withTraining ? [pluralSr(r.workouts_done, 'trening', 'treninga', 'treninga')] : []),
  ]
  return `${parts.slice(0, -1).join(', ')} i ${parts.at(-1)}.`
}

/** Prelom teksta po širini; `measure` vraća širinu niza u istim jedinicama kao `maxWidth` (pdf-lib font.widthOfTextAtSize). */
export function wrapText(text: string, measure: (s: string) => number, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split(/\r?\n/)) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word
      if (line && measure(candidate) > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    lines.push(line)
  }
  return lines
}
