import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfile, useSession } from '@/api/auth'
import { useTeamOverview } from '@/api/team'
import { ErrorNote, Loading, Page, StatusPill } from '@/components/team/ui'
import { Avatar, Segmented } from '@/components/ui'
import { cn } from '@/lib/cn'
import { firstName } from '@/lib/labels'
import { countOverview, defaultView, forView, greeting, type TeamView } from '@/lib/teamStatus'

function Stat({
  label,
  value,
  hint,
  active,
}: {
  label: string
  value: number
  hint: string
  active?: boolean
}) {
  return (
    <div className={cn('rounded-card-lg p-5', active ? 'bg-brand' : 'bg-card')}>
      <p className={cn('text-sm', active ? 'font-bold' : 'text-muted')}>{label}</p>
      <p className="mt-1 text-4xl font-extrabold">{value}</p>
      <p className={cn('text-sm', active ? 'font-bold' : 'text-muted')}>{hint}</p>
    </div>
  )
}

/** Tim – pregled (design/Tim – pregled.png): prekidač Olgica / Ognjen / ceo tim, kartice i feedback za pregled. */
export default function TeamOverview() {
  const session = useSession()
  const profile = useProfile(session.data?.user.id)
  const overview = useTeamOverview()
  const [chosen, setChosen] = useState<TeamView>()
  const view = chosen ?? defaultView(profile.data?.role)

  const rows = forView(overview.data ?? [], view)
  const counts = countOverview(rows)
  const feedback = rows.filter((r) => r.team_status === 'feedback_in')
  const name = firstName(profile.data?.full_name)

  return (
    <Page>
      <header className="flex items-center gap-4">
        <Avatar
          name={name || 'T'}
          tone={profile.data?.role === 'trainer' ? 'ognjen' : 'olgica'}
          size="lg"
        />
        <div>
          <h1 className="text-3xl font-extrabold leading-tight">
            {greeting()}, {name}
          </h1>
          <p className="text-muted">Bez poziva — sve ide porukom</p>
        </div>
      </header>

      <div className="mt-6">
        <Segmented<TeamView>
          label="Prikaz"
          value={view}
          onChange={setChosen}
          options={[
            { value: 'olgica', label: 'Olgica' },
            { value: 'ognjen', label: 'Ognjen' },
            { value: 'all', label: 'Ceo tim' },
          ]}
        />
      </div>

      {overview.isPending && <Loading />}
      {overview.isError && <ErrorNote>Pregled se nije učitao. Osveži stranicu.</ErrorNote>}

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Feedback" value={counts.feedback} hint="za pregled" active />
        <Stat label="Kasne" value={counts.late} hint="podsetnik poslat" />
        <Stat label="Novi planovi" value={counts.newPlans} hint="čekaju izradu" />
      </div>

      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="text-2xl font-extrabold">Feedback za pregled</h2>
        <Link to="/tim/feedback" className="font-bold text-brand-text underline">
          Svi
        </Link>
      </div>

      <ul className="mt-3 rounded-card-lg bg-card px-5">
        {feedback.map((r) => (
          <li key={r.client_id} className="border-b border-line last:border-0">
            <Link
              to={`/tim/klijenti/${r.client_id}`}
              className="flex min-h-[72px] items-center gap-4 py-3"
            >
              <Avatar name={r.full_name ?? '?'} tone="client" />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold">
                  {r.full_name} · dan {r.program_day}
                </span>
                <span className="block text-muted">{r.plan_focus ?? r.plan_name}</span>
              </span>
              <StatusPill status={r.team_status} />
            </Link>
          </li>
        ))}
        {overview.isSuccess && feedback.length === 0 && (
          <li className="py-5 text-muted">Nema feedbacka za pregled.</li>
        )}
      </ul>

      {counts.newPlans > 0 && (
        <Link
          to="/tim/klijenti?filter=new_plan"
          className="mt-4 flex min-h-[64px] items-center justify-between rounded-card-lg bg-ink px-6 font-extrabold text-white"
        >
          <span>{counts.newPlans} novih planova čeka izradu</span>
          <span aria-hidden="true">→</span>
        </Link>
      )}

      <Link to="/tim/pitanja" className="mt-4 flex items-center gap-4 rounded-card-lg bg-card p-5">
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-extrabold">
            Asistent: {counts.pendingReview} odgovora za potvrdu
          </span>
          <span className="block text-muted">Zamene koje čekaju tim</span>
        </span>
        <span className="font-bold text-brand-text underline">Vidi</span>
      </Link>
    </Page>
  )
}
