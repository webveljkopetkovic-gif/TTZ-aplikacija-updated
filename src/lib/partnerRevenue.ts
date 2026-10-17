/**
 * Partner panel: obračun iz redova get_partner_revenue() (mesec · vrsta plana · prodaja · prihod · udeo).
 * Partner vidi samo ove brojeve, nikad podatke klijenata (CLAUDE.md).
 */

export type PlanKind = 'nutrition' | 'nutrition_training'

export interface RevenueRow {
  month: string | null
  kind: PlanKind | null
  sales: number | null
  revenue_rsd: number | null
  partner_share_rsd: number | null
}

export const PLAN_KIND_LABEL: Record<PlanKind, string> = {
  nutrition: 'Ishrana + suplementi',
  nutrition_training: 'Ishrana + suplementi + vežbe',
}

const KINDS: readonly PlanKind[] = ['nutrition', 'nutrition_training']
const MONTH_NAMES = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']

/** „2026-10-01T00:00:00“ → „2026-10“. */
export const monthKey = (month: string): string => month.slice(0, 7)

export const monthName = (key: string): string => MONTH_NAMES[Number(key.slice(5, 7)) - 1] ?? key
export const monthShort = (key: string): string => MONTH_SHORT[Number(key.slice(5, 7)) - 1] ?? key

/** Pomeri ključ meseca za `delta` meseci (može preko granice godine). */
export function shiftMonth(key: string, delta: number): string {
  const total = Number(key.slice(0, 4)) * 12 + (Number(key.slice(5, 7)) - 1) + delta
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

export interface PlanLine {
  kind: PlanKind
  sales: number
  revenue: number
  share: number
  /** Prosečna cena po prodatom planu (prihod / prodato). */
  price: number
}

export interface Summary {
  sales: number
  revenue: number
  share: number
  lines: PlanLine[]
}

/** Zbir za jedan mesec ključem „2026-10“ ili za sve (`null`). Uvek vraća oba plana, i sa nulama. */
export function summarize(rows: readonly RevenueRow[], period: string | null): Summary {
  const lines = KINDS.map((kind): PlanLine => {
    let sales = 0
    let revenue = 0
    let share = 0
    for (const r of rows) {
      if (r.kind !== kind || !r.month) continue
      if (period && monthKey(r.month) !== period) continue
      sales += Number(r.sales ?? 0)
      revenue += Number(r.revenue_rsd ?? 0)
      share += Number(r.partner_share_rsd ?? 0)
    }
    return { kind, sales, revenue, share, price: sales > 0 ? Math.round(revenue / sales) : 0 }
  })
  return {
    lines,
    sales: lines.reduce((a, l) => a + l.sales, 0),
    revenue: lines.reduce((a, l) => a + l.revenue, 0),
    share: lines.reduce((a, l) => a + l.share, 0),
  }
}

/** Meseci koji imaju prodaju, od najnovijeg. */
export function monthsWithSales(rows: readonly RevenueRow[]): string[] {
  const set = new Set<string>()
  for (const r of rows) if (r.month) set.add(monthKey(r.month))
  return [...set].sort().reverse()
}

export interface MonthBar {
  key: string
  label: string
  share: number
}

/** Udeo po mesecima za grafikon: poslednjih `count` meseci do `last` (i meseci bez prodaje, sa nulom). */
export function shareByMonth(rows: readonly RevenueRow[], last: string, count = 6): MonthBar[] {
  return Array.from({ length: count }, (_, i) => {
    const key = shiftMonth(last, i - (count - 1))
    return { key, label: monthShort(key), share: summarize(rows, key).share }
  })
}

/** 54000 → „54.000 RSD“ (srpski zapis, bez decimala). */
export const rsd = (value: number): string =>
  `${new Intl.NumberFormat('sr-Latn-RS', { maximumFractionDigits: 0 }).format(value)} RSD`

/** CSV za knjigovođu: jedan red po mesecu i planu. Separator „;“ da Excel u srpskom podešavanju otvori kolone. */
export function revenueCsv(rows: readonly RevenueRow[]): string {
  const sorted = rows
    .filter((r): r is RevenueRow & { month: string; kind: PlanKind } => !!r.month && !!r.kind)
    .sort((a, b) => monthKey(b.month).localeCompare(monthKey(a.month)) || a.kind.localeCompare(b.kind))
  const lines = [
    ['Mesec', 'Plan', 'Prodato', 'Prihod (RSD)', 'Moj udeo (RSD)'].join(';'),
    ...sorted.map((r) =>
      [
        monthKey(r.month),
        PLAN_KIND_LABEL[r.kind],
        Number(r.sales ?? 0),
        Number(r.revenue_rsd ?? 0),
        Number(r.partner_share_rsd ?? 0),
      ].join(';'),
    ),
  ]
  // BOM da Excel prepozna UTF-8 (ž, š, ć u nazivima planova)
  return `\uFEFF${lines.join('\r\n')}\r\n`
}
