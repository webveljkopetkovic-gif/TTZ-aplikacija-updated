import { cn } from '@/lib/cn'
import { parseDecimal } from '@/lib/intakeSchema'
import { BMI_TABLE, bmiCategory, calcBmi } from '@/lib/trainingSchema'

/** BMI uživo iz visine i težine, sa tabelom klasifikacije za odrasle (Ognjenov upitnik). */
export function BmiCard({ height, weight }: { height: unknown; weight: unknown }) {
  const num = (v: unknown) =>
    typeof v === 'string' || typeof v === 'number' ? parseDecimal(v) : NaN
  const bmi = calcBmi(num(height), num(weight))
  const current = bmi === null ? null : bmiCategory(bmi)
  return (
    <div className="rounded-card-lg bg-card p-5" aria-live="polite">
      <p className="text-sm font-semibold text-muted">BMI (indeks telesne mase)</p>
      <p className="mt-1 text-3xl font-extrabold">
        {bmi === null ? '–' : bmi.toLocaleString('sr-Latn-RS', { minimumFractionDigits: 1 })}
        {current && (
          <span className="ml-3 text-base font-bold text-brand-text">{current.label}</span>
        )}
      </p>
      <p className="mt-1 text-sm text-muted">
        Telesna masa podeljena sa visinom u metrima na kvadrat.
      </p>
      <table className="mt-4 w-full text-left text-sm">
        <caption className="sr-only">Klasifikacija BMI za odrasle</caption>
        <thead>
          <tr className="text-muted">
            <th scope="col" className="py-1 font-semibold">
              BMI
            </th>
            <th scope="col" className="py-1 font-semibold">
              Kategorija
            </th>
          </tr>
        </thead>
        <tbody>
          {BMI_TABLE.map((row) => (
            <tr
              key={row.label}
              className={cn(row.label === current?.label && 'bg-brand font-extrabold')}
            >
              <td className="rounded-l-lg px-2 py-1.5">{row.range}</td>
              <td className="rounded-r-lg px-2 py-1.5">{row.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
