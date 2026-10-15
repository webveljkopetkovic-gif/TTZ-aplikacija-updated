import { Navigate } from 'react-router-dom'
import { useSession, useSignOut } from '@/api/auth'
import { useCurrentProgram, useManualPaymentSettings, useProgramPayment } from '@/api/programs'
import { formatRsd } from '@/api/products'
import { Button, Card } from '@/components/ui'
import { homeForStatus } from '@/lib/programHome'

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={strong ? 'text-xl font-extrabold' : 'font-bold'}>{value}</dd>
    </div>
  )
}

/** Instrukcije za ručnu uplatu. Ekran se sam menja čim admin potvrdi uplatu (status se osvežava na 10 s). */
export default function PaymentPending() {
  const session = useSession()
  const program = useCurrentProgram(session.data?.user.id)
  const payment = useProgramPayment(program.data?.id)
  const settings = useManualPaymentSettings()
  const signOut = useSignOut()

  if (program.data && program.data.status !== 'awaiting_payment') {
    return <Navigate to={homeForStatus(program.data.status)} replace />
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-10">
      <p className="w-fit rounded-full bg-brand px-4 py-2 text-sm font-extrabold uppercase">
        Još samo uplata
      </p>
      <h1 className="mt-6 text-4xl font-extrabold leading-tight">
        Uplati plan i <span className="text-brand-text">tim počinje.</span>
      </h1>
      <p className="mt-3 text-lg text-muted">
        Nalog je napravljen. Čim uplata bude potvrđena, Olgica i Ognjen počinju da prave tvoj plan.
      </p>

      <Card className="mt-8">
        {payment.data ? (
          <dl className="divide-y divide-line">
            <Row label="Plan" value={program.data?.products?.name ?? '—'} />
            <Row label="Iznos" value={formatRsd(payment.data.amount_rsd)} strong />
            <Row label="Primalac" value={settings.data?.recipient ?? 'Podaci stižu uskoro'} />
            <Row label="Broj računa" value={settings.data?.account ?? 'Podaci stižu uskoro'} />
            <Row label="Poziv na broj" value={payment.data.provider_ref ?? '—'} strong />
          </dl>
        ) : (
          <p role="status" className="text-muted">
            Učitavanje podataka za uplatu…
          </p>
        )}
      </Card>

      <p role="status" className="mt-6 rounded-card bg-card p-4 font-semibold">
        Čekamo potvrdu uplate. Ova strana se sama osvežava, a javljamo ti i porukom.
      </p>
      <p className="mt-4 text-sm text-muted">
        Obavezno upiši poziv na broj, da bismo prepoznali uplatu.
      </p>

      <Button className="mt-auto self-start" variant="soft" onClick={() => signOut.mutate()}>
        Odjavi se
      </Button>
    </main>
  )
}
