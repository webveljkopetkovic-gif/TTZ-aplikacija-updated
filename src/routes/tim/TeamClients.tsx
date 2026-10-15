import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTeamOverview } from '@/api/team'
import { ErrorNote, Loading, Page, StatusPill } from '@/components/team/ui'
import { Avatar } from '@/components/ui'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

type Filter = 'all' | 'feedback_in' | 'late' | 'new_plan'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Svi' },
  { value: 'feedback_in', label: 'Feedback stigao' },
  { value: 'late', label: 'Kasni' },
  { value: 'new_plan', label: 'Nov plan' },
]

/** Email i telefon za pretragu (tim čita sve profile). */
function useContacts() {
  return useQuery({
    queryKey: ['client-contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, phone')
        .eq('role', 'client')
      if (error) throw error
      return new Map((data ?? []).map((p) => [p.id, `${p.email} ${p.phone ?? ''}`.toLowerCase()]))
    },
  })
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/** Dosijei klijenata (design/Dosijei klijenata.png): pretraga i filteri. */
export default function TeamClients() {
  const [params, setParams] = useSearchParams()
  const initial = params.get('filter')
  const [filter, setFilter] = useState<Filter>(
    FILTERS.some((f) => f.value === initial) ? (initial as Filter) : 'all',
  )
  const [query, setQuery] = useState('')
  const overview = useTeamOverview()
  const contacts = useContacts()

  const rows = useMemo(() => overview.data ?? [], [overview.data])
  const counts = useMemo(
    () => ({
      all: rows.length,
      feedback_in: rows.filter((r) => r.team_status === 'feedback_in').length,
      late: rows.filter((r) => r.team_status === 'late').length,
      new_plan: rows.filter((r) => r.team_status === 'new_plan').length,
    }),
    [rows],
  )

  const q = normalize(query)
  const visible = rows
    .filter((r) => filter === 'all' || r.team_status === filter)
    .filter(
      (r) =>
        q === '' ||
        normalize(r.full_name ?? '').includes(q) ||
        (contacts.data?.get(r.client_id ?? '') ?? '').includes(q.replace(/\s/g, '')) ||
        (contacts.data?.get(r.client_id ?? '') ?? '').includes(q),
    )

  const choose = (value: Filter) => {
    setFilter(value)
    setParams(value === 'all' ? {} : { filter: value }, { replace: true })
  }

  return (
    <Page>
      <h1 className="text-4xl font-extrabold">Dosijei</h1>
      <p className="mt-1 text-muted">{rows.length} klijenata · klikni za ceo dosije</p>

      <div className="mt-5">
        <label htmlFor="client-search" className="sr-only">
          Pretraga klijenata
        </label>
        <input
          id="client-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ime, telefon ili email"
          className="min-h-[56px] w-full rounded-full border border-line bg-card px-6 text-lg placeholder:text-muted"
        />
      </div>

      <div role="group" aria-label="Filter" className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => choose(f.value)}
            className={cn(
              'min-h-btn rounded-full px-5 text-base font-bold',
              filter === f.value ? 'bg-brand text-ink' : 'bg-card text-ink',
            )}
          >
            {f.label} {counts[f.value]}
          </button>
        ))}
      </div>

      {overview.isPending && <Loading />}
      {overview.isError && <ErrorNote>Dosijei se nisu učitali. Osveži stranicu.</ErrorNote>}

      <ul className="mt-5 rounded-card-lg bg-card px-5">
        {visible.map((r) => (
          <li key={r.client_id} className="border-b border-line last:border-0">
            <Link
              to={`/tim/klijenti/${r.client_id}`}
              className="flex min-h-[80px] items-center gap-4 py-3"
            >
              <Avatar name={r.full_name ?? '?'} tone="client" />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold">{r.full_name}</span>
                <span className="block text-muted">
                  {[
                    r.plan_focus,
                    r.product_kind === 'nutrition_training' ? 'ishrana + vežbe' : 'samo ishrana',
                    `dan ${r.program_day ?? 0}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <StatusPill status={r.team_status} />
            </Link>
          </li>
        ))}
        {overview.isSuccess && visible.length === 0 && (
          <li className="py-5 text-muted">Nema klijenata za ovaj filter.</li>
        )}
      </ul>
    </Page>
  )
}
