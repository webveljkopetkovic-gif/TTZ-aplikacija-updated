import { useState } from 'react'
import { ApiError } from '@/api/functions'
import { useRetryNotification, useTeamNotifications } from '@/api/feedback'
import { ErrorNote, Loading, Page } from '@/components/team/ui'
import { cn } from '@/lib/cn'

type Filter = 'all' | 'failed' | 'queued'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Sve' },
  { value: 'failed', label: 'Neuspele' },
  { value: 'queued', label: 'Na čekanju' },
]

export const KIND_LABEL: Record<string, string> = {
  plan_ready: 'Plan spreman',
  feedback_due: 'Feedback otvoren',
  feedback_reminder: 'Podsetnik za feedback',
  team_reply: 'Odgovor tima',
  program_end: 'Kraj programa',
}

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  app: 'Aplikacija',
}

const STATUS: Record<string, { label: string; className: string }> = {
  sent: { label: 'Poslato', className: 'bg-brand text-ink' },
  failed: { label: 'Neuspelo', className: 'border border-danger text-danger' },
  queued: { label: 'Na čekanju', className: 'bg-line text-ink' },
  skipped: { label: 'Preskočeno', className: 'bg-line text-ink' },
}

const when = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('sr-Latn', {
        timeZone: 'Europe/Belgrade',
        day: 'numeric',
        month: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso))
    : '—'

/** Log poslatih i neuspelih poruka (WhatsApp i email), sa ponovnim slanjem neuspelih. */
export default function TeamNotifications() {
  const notifications = useTeamNotifications()
  const retry = useRetryNotification()
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState<string>()

  const rows = notifications.data ?? []
  const count = (f: Filter) =>
    f === 'all' ? rows.length : rows.filter((r) => r.status === f).length
  const visible = rows.filter((r) => filter === 'all' || r.status === filter)

  return (
    <Page wide>
      <h1 className="text-4xl font-extrabold">Obaveštenja</h1>
      <p className="mt-1 text-muted">
        Poruke klijentima: WhatsApp i email. Poslednjih {rows.length || 200}.
      </p>

      <div role="group" aria-label="Filter" className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'min-h-btn rounded-full px-5 text-base font-bold',
              filter === f.value ? 'bg-brand text-ink' : 'bg-card text-ink',
            )}
          >
            {f.label} {count(f.value)}
          </button>
        ))}
      </div>

      {notifications.isPending && <Loading />}
      {notifications.isError && (
        <ErrorNote>Obaveštenja se nisu učitala. Osveži stranicu.</ErrorNote>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="mt-5 overflow-x-auto rounded-card-lg bg-card p-5">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-line text-sm text-muted">
              <th className="py-2 pr-3 font-semibold">Klijent</th>
              <th className="py-2 pr-3 font-semibold">Poruka</th>
              <th className="py-2 pr-3 font-semibold">Kanal</th>
              <th className="py-2 pr-3 font-semibold">Status</th>
              <th className="py-2 pr-3 font-semibold">Vreme</th>
              <th className="py-2 font-semibold">
                <span className="sr-only">Akcija</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((n) => {
              const status = STATUS[n.status] ?? STATUS.queued
              return (
                <tr key={n.id} className="border-b border-line align-top last:border-0">
                  <td className="py-3 pr-3 font-bold">{n.profiles?.full_name ?? '—'}</td>
                  <td className="py-3 pr-3">{KIND_LABEL[n.kind] ?? n.kind}</td>
                  <td className="py-3 pr-3">{CHANNEL_LABEL[n.channel] ?? n.channel}</td>
                  <td className="py-3 pr-3">
                    <span
                      className={cn(
                        'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-extrabold',
                        status.className,
                      )}
                    >
                      {status.label}
                    </span>
                    {n.error && <p className="mt-1 max-w-xs text-sm text-danger">{n.error}</p>}
                  </td>
                  <td className="py-3 pr-3 text-muted">{when(n.sent_at ?? n.scheduled_for)}</td>
                  <td className="py-3">
                    {n.status === 'failed' && (
                      <button
                        type="button"
                        disabled={retry.isPending}
                        onClick={() => {
                          setError(undefined)
                          retry.mutate(n.id, {
                            onError: (e) =>
                              setError(e instanceof ApiError ? e.message : 'Slanje nije uspelo.'),
                          })
                        }}
                        className="min-h-btn rounded-full border border-ink px-4 text-sm font-bold disabled:opacity-50"
                      >
                        Pošalji ponovo
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {notifications.isSuccess && visible.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-muted">
                  Nema poruka za ovaj filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Page>
  )
}
