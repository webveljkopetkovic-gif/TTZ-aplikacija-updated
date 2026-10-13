import { Link } from 'react-router-dom'
import { ApiError } from '@/api/functions'
import { useConfirmPayment, usePayments, type AdminPayment } from '@/api/payments'
import { formatRsd } from '@/api/products'
import { Button, Chip } from '@/components/ui'

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('sr-Latn-RS', {
    timeZone: 'Europe/Belgrade',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

function PaymentRow({ payment }: { payment: AdminPayment }) {
  const confirm = useConfirmPayment()
  const pending = payment.status === 'pending'

  return (
    <li className="flex flex-col gap-3 rounded-card border border-line bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-lg font-extrabold">
          {payment.profiles?.full_name ?? payment.profiles?.email}
        </p>
        <p className="text-muted">
          {payment.programs?.products?.name} · {formatRsd(payment.amount_rsd)}
        </p>
        <p className="text-sm text-muted">
          Poziv na broj <span className="font-bold text-ink">{payment.provider_ref}</span> ·{' '}
          {formatDate(payment.created_at)}
        </p>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        {pending ? (
          <Button disabled={confirm.isPending} onClick={() => confirm.mutate(payment.id)}>
            {confirm.isPending ? 'Potvrđujem…' : 'Uplata primljena'}
          </Button>
        ) : (
          <Chip tone={payment.status === 'paid' ? 'lime' : 'gray'}>
            {payment.status === 'paid' ? 'Potvrđeno' : payment.status}
          </Chip>
        )}
        {confirm.isError && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {confirm.error instanceof ApiError ? confirm.error.message : 'Potvrda nije uspela'}
          </p>
        )}
      </div>
    </li>
  )
}

/** Uplate na čekanju i poslednje potvrđene. Samo admin (PLAN.md faza 2, ručni provider). */
export default function TeamPayments() {
  const payments = usePayments()
  const list = payments.data ?? []
  const pending = list.filter((p) => p.status === 'pending')
  const rest = list.filter((p) => p.status !== 'pending')

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link to="/tim" className="font-bold text-brand-text underline">
        ← Konzola tima
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold">Uplate</h1>
      <p className="mt-1 text-muted">
        Kad uplata stigne na račun, potvrdi je. Klijent odmah ulazi u dan 0.
      </p>

      {payments.isPending && (
        <p role="status" className="mt-6 text-muted">
          Učitavanje…
        </p>
      )}
      {payments.isError && (
        <p role="alert" className="mt-6 font-bold text-danger">
          Uplate se nisu učitale.
        </p>
      )}

      <h2 className="mt-8 text-xl font-extrabold">Čekaju potvrdu ({pending.length})</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {pending.map((p) => (
          <PaymentRow key={p.id} payment={p} />
        ))}
        {payments.isSuccess && pending.length === 0 && (
          <li className="text-muted">Nema uplata na čekanju.</li>
        )}
      </ul>

      {rest.length > 0 && (
        <>
          <h2 className="mt-8 text-xl font-extrabold">Potvrđene</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {rest.map((p) => (
              <PaymentRow key={p.id} payment={p} />
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
