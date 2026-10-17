import { describe, expect, it } from 'vitest'
import {
  monthsWithSales,
  revenueCsv,
  rsd,
  shareByMonth,
  shiftMonth,
  summarize,
  type RevenueRow,
} from './partnerRevenue'

const row = (
  month: string,
  kind: RevenueRow['kind'],
  sales: number,
  revenue_rsd: number,
): RevenueRow => ({
  month: `${month}-01T00:00:00`,
  kind,
  sales,
  revenue_rsd,
  partner_share_rsd: Math.round(revenue_rsd * 0.3),
})

const rows = [
  row('2026-10', 'nutrition', 9, 54000),
  row('2026-10', 'nutrition_training', 14, 126000),
  row('2026-09', 'nutrition', 7, 42000),
]

describe('partnerRevenue', () => {
  it('summarize za mesec daje prodaju, prihod i udeo od 30%', () => {
    const s = summarize(rows, '2026-10')
    expect(s.sales).toBe(23)
    expect(s.revenue).toBe(180000)
    expect(s.share).toBe(54000)
    expect(s.lines.map((l) => [l.kind, l.price])).toEqual([
      ['nutrition', 6000],
      ['nutrition_training', 9000],
    ])
  })

  it('summarize bez perioda sabira sve, a prazan mesec daje nule', () => {
    expect(summarize(rows, null).revenue).toBe(222000)
    const empty = summarize(rows, '2026-01')
    expect(empty.sales).toBe(0)
    expect(empty.lines).toHaveLength(2)
    expect(empty.lines[0].price).toBe(0)
  })

  it('shiftMonth prelazi granicu godine', () => {
    expect(shiftMonth('2026-02', -3)).toBe('2025-11')
    expect(shiftMonth('2026-11', 2)).toBe('2027-01')
  })

  it('shareByMonth vraća 6 meseci do poslednjeg, sa nulom za mesece bez prodaje', () => {
    const bars = shareByMonth(rows, '2026-10')
    expect(bars.map((b) => b.label)).toEqual(['Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt'])
    expect(bars.map((b) => b.share)).toEqual([0, 0, 0, 0, 12600, 54000])
  })

  it('monthsWithSales ide od najnovijeg', () => {
    expect(monthsWithSales(rows)).toEqual(['2026-10', '2026-09'])
  })

  it('rsd piše iznos sa tačkom za hiljade', () => {
    expect(rsd(54000).replace(/\s| /g, '')).toMatch(/^54[.,]?000RSD$/)
  })

  it('csv ima zaglavlje, BOM i red po mesecu i planu', () => {
    const csv = revenueCsv(rows)
    expect(csv.startsWith('﻿Mesec;Plan;Prodato;Prihod (RSD);Moj udeo (RSD)')).toBe(true)
    expect(csv.trim().split('\r\n')).toHaveLength(4)
    expect(csv).toContain('2026-10;Ishrana + suplementi;9;54000;16200')
  })
})
