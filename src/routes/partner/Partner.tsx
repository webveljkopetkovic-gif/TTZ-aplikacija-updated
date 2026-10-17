import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfile, useSession, useSignOut } from '@/api/auth'
import { usePartnerRevenue } from '@/api/partner'
import { Avatar } from '@/components/ui'
import { cn } from '@/lib/cn'
import {
  monthName,
  monthsWithSales,
  PLAN_KIND_LABEL,
  revenueCsv,
  rsd,
  shareByMonth,
  summarize,
} from '@/lib/partnerRevenue'

/** Izvoz CSV-a u fajl koji telefon ili računar preuzme. */
function downloadCsv(csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'ttz-partner-prihodi.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/** Partner panel (design/Partner panel – moj udeo 30.png): samo prihodi i udeo, nikad podaci klijenata. */
export default function Partner() {
  const session = useSession()
  const profile = useProfile(session.data?.user.id)
  const signOut = useSignOut()
  const revenue = usePartnerRevenue()
  const [picked, setPicked] = useState<string>()

  const rows = revenue.data ?? []
  const months = monthsWithSales(rows)
  // tri izbora kao na dizajnu: tekući, prethodni mesec i ukupno
  const tabs = months.slice(0, 2)
  const period = picked ?? tabs[0] ?? 'all'
  const summary = summarize(rows, period === 'all' ? null : period)
  const bars = tabs[0] ? shareByMonth(rows, tabs[0]) : []
  const maxShare = Math.max(1, ...bars.map((b) => b.share))
  const periodLabel = period === 'all' ? 'ukupno' : monthName(period).toLowerCase()
  const name = profile.data?.full_name ?? profile.data?.email ?? ''

  return (
    <main className="mx-auto max-w-6xl px-6 pb-16">
      <header className="flex items-center justify-between gap-4 border-b border-line py-5">
        <div className="flex items-center gap-4">
          <span className="leading-none">
            <span className="block text-3xl font-extrabold italic tracking-tight">TTZ</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              Tvoj tim zdravlja
            </span>
          </span>
          <span className="rounded-full bg-ink px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white">
            Partner panel
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="font-extrabold">{name}</p>
            <p className="text-sm text-muted">Razvoj i automatizacija · udeo 30%</p>
          </div>
          <Avatar name={name || 'V'} tone="olgica" />
        </div>
      </header>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold">Moj udeo od prodaje</h1>
          <p className="mt-1 text-muted">30% od svakog plana koji TTZ proda · puni se iz uplata</p>
        </div>
        {months.length > 0 && (
          <div role="group" aria-label="Period" className="flex gap-1 rounded-full bg-card p-1.5">
            {[...tabs, 'all'].map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={period === key}
                onClick={() => setPicked(key)}
                className={cn(
                  'min-h-btn rounded-full px-5 font-extrabold',
                  period === key ? 'bg-ink text-white' : 'text-muted',
                )}
              >
                {key === 'all' ? 'Ukupno' : monthName(key)}
              </button>
            ))}
          </div>
        )}
      </div>

      {revenue.isPending && (
        <p role="status" className="mt-8 text-muted">
          Učitavanje…
        </p>
      )}
      {revenue.isError && (
        <p role="alert" className="mt-8 font-bold text-danger">
          Prihodi se nisu učitali. Osveži stranicu.
        </p>
      )}
      {revenue.isSuccess && rows.length === 0 && (
        <p className="mt-8 rounded-card-lg bg-card p-6 text-muted">
          Još nema plaćenih planova. Prihodi se pojavljuju čim prva uplata bude potvrđena.
        </p>
      )}

      {rows.length > 0 && (
        <>
          <section aria-label="Pregled" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-card-lg bg-brand p-6">
              <p className="font-extrabold">Moj udeo · {periodLabel}</p>
              <p className="mt-3 text-4xl font-extrabold">{rsd(summary.share)}</p>
              <p className="mt-1 font-bold">30% od bruto prodaje</p>
            </div>
            <div className="rounded-card-lg bg-card p-6">
              <p className="text-muted">Bruto prodaja</p>
              <p className="mt-3 text-4xl font-extrabold">{rsd(summary.revenue)}</p>
            </div>
            <div className="rounded-card-lg bg-card p-6">
              <p className="text-muted">Prodatih planova</p>
              <p className="mt-3 text-4xl font-extrabold">{summary.sales}</p>
              <p className="mt-1 text-muted">
                {summary.lines[0].sales} ishrana · {summary.lines[1].sales} sa vežbama
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-card-lg bg-card p-6" aria-label="Obračun po planu">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-2xl font-extrabold">Obračun po planu · {periodLabel}</h2>
              <p className="text-sm text-muted">Udeo = prodato × cena × 30%</p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-right">
                <thead className="text-sm text-muted">
                  <tr className="border-b border-line">
                    <th className="py-2 text-left font-bold">Plan</th>
                    <th className="py-2 font-bold">Prodato</th>
                    <th className="py-2 font-bold">Cena</th>
                    <th className="py-2 font-bold">Prihod</th>
                    <th className="py-2 font-bold">Moj udeo</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.lines.map((l) => (
                    <tr key={l.kind} className="border-b border-line">
                      <th scope="row" className="py-4 text-left font-extrabold">
                        {PLAN_KIND_LABEL[l.kind]}
                      </th>
                      <td>{l.sales}</td>
                      <td className="text-muted">{l.sales > 0 ? rsd(l.price) : '–'}</td>
                      <td>{rsd(l.revenue)}</td>
                      <td className="font-extrabold text-brand-text">{rsd(l.share)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-extrabold">
                    <th scope="row" className="py-4 text-left">
                      Ukupno
                    </th>
                    <td>{summary.sales}</td>
                    <td />
                    <td>{rsd(summary.revenue)}</td>
                    <td>{rsd(summary.share)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="mt-6 rounded-card-lg bg-card p-6" aria-label="Udeo po mesecima">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-2xl font-extrabold">Moj udeo po mesecima</h2>
              <p className="text-sm text-muted">poslednjih 6 meseci</p>
            </div>
            <ul className="mt-6 grid h-56 grid-cols-6 items-end gap-3">
              {bars.map((b, i) => (
                <li key={b.key} className="flex h-full flex-col items-center justify-end gap-2">
                  <span className="text-sm font-extrabold">{rsd(b.share)}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'w-full max-w-[72px] rounded-t-2xl',
                      i === bars.length - 1 ? 'bg-brand' : 'bg-line',
                    )}
                    style={{ height: `${Math.max(4, Math.round((b.share / maxShare) * 70))}%` }}
                  />
                  <span className="text-sm font-bold text-muted">{b.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => downloadCsv(revenueCsv(rows))}
              className="min-h-btn rounded-full bg-ink px-6 font-extrabold text-white"
            >
              Izvezi CSV
            </button>
            <p className="text-sm text-muted">
              Dogovor: tim dobija 30% od svakog prodatog plana, mesečno. Isplata do 5. u narednom
              mesecu.
            </p>
          </div>
        </>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-4">
        {profile.data?.role === 'admin' && (
          <Link to="/tim/uplate" className="font-bold text-brand-text underline">
            Uplate na čekanju
          </Link>
        )}
        <button
          type="button"
          onClick={() => signOut.mutate()}
          className="min-h-btn rounded-full bg-card px-6 font-bold"
        >
          Odjavi se
        </button>
      </div>
    </main>
  )
}
