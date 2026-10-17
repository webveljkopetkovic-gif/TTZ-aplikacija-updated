import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useReviewProposal, useTeamProposals, type TeamProposal } from '@/api/assistant'
import { ErrorNote, Loading, OwnerTag, Page } from '@/components/team/ui'
import { ChoiceChip } from '@/components/ui'
import { cn } from '@/lib/cn'
import { findMealRuleViolation } from '@/lib/mealRules'
import { SLOT_LABEL } from '@/lib/planMeals'

type Tab = 'pending' | 'done'

const RESULT_LABEL = { approved: 'Odobreno', edited: 'Izmenjeno i odobreno', rejected: 'Odbijeno' }

const when = (iso: string) =>
  new Intl.DateTimeFormat('sr-Latn-RS', {
    timeZone: 'Europe/Belgrade',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

/** Hitne eskalacije prvo, pa ostale eskalacije, pa zamene; unutar grupe najstarije prvo. */
function rank(p: TeamProposal) {
  const a = p.proposed_action
  if (a?.type === 'escalation') return a.urgency === 'high' ? 0 : 1
  return 2
}

function Proposal({ p }: { p: TeamProposal }) {
  const a = p.proposed_action
  if (!a) return null
  if (a.type === 'meal_swap') {
    return (
      <p>
        <span className="text-muted">
          Dan plana {a.plan_day} · {SLOT_LABEL[a.slot]}:
        </span>{' '}
        <strong>{a.title}</strong>
        {a.reason && <span className="block text-sm text-muted">Razlog: {a.reason}</span>}
      </p>
    )
  }
  if (a.type === 'workout_swap') {
    return (
      <p>
        <strong>{a.exercise}</strong> → <strong>{a.replacement}</strong>
        {a.reason && <span className="block text-sm text-muted">Razlog: {a.reason}</span>}
      </p>
    )
  }
  return (
    <p className={cn(a.urgency === 'high' && 'font-extrabold text-danger')}>
      {a.urgency === 'high' ? 'Hitno: ' : ''}
      {a.reason}
    </p>
  )
}

function ReviewForm({ p }: { p: TeamProposal }) {
  const review = useReviewProposal()
  const a = p.proposed_action!
  const initial = a.type === 'meal_swap' ? a.title : a.type === 'workout_swap' ? a.replacement : ''
  const [title, setTitle] = useState(initial)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()

  const isSwap = a.type !== 'escalation'
  const edited = isSwap && title.trim() !== initial

  function decide(result: 'approved' | 'rejected') {
    setError(undefined)
    if (result === 'approved' && a.type === 'meal_swap') {
      const violation = findMealRuleViolation(title)
      if (violation) return setError(violation)
    }
    if (result === 'approved' && isSwap && !title.trim()) return setError('Upiši zamenu')
    review.mutate(
      {
        id: p.id,
        result: result === 'approved' && edited ? 'edited' : result,
        title: edited ? title.trim() : undefined,
        note: note.trim() || undefined,
      },
      { onError: (e) => setError(e.message) },
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {isSwap && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">
            {a.type === 'meal_swap' ? 'Novi obrok (možeš da izmeniš)' : 'Zamena vežbe (možeš da izmeniš)'}
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            className="min-h-btn rounded-full border border-line bg-bg px-4"
          />
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold">Poruka klijentu (opciono, stiže u Pitanja)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={1000}
          className="rounded-card border border-line bg-bg px-4 py-3"
        />
      </label>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={review.isPending}
          onClick={() => decide('approved')}
          className="min-h-btn rounded-full bg-brand px-6 font-extrabold text-ink disabled:opacity-60"
        >
          {isSwap ? (edited ? 'Izmeni i odobri' : 'Odobri') : 'Označi kao pročitano'}
        </button>
        {isSwap && (
          <button
            type="button"
            disabled={review.isPending}
            onClick={() => decide('rejected')}
            className="min-h-btn rounded-full border-2 border-line px-6 font-extrabold disabled:opacity-60"
          >
            Odbij
          </button>
        )}
      </div>
    </div>
  )
}

function Card({ p }: { p: TeamProposal }) {
  const a = p.proposed_action
  return (
    <li className="rounded-card-lg bg-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/tim/klijenti/${p.client_id}`} className="text-lg font-extrabold underline">
          {p.profiles?.full_name ?? 'Klijent'}
        </Link>
        <span className="text-sm text-muted">{when(p.created_at)}</span>
        <span className="ml-auto">
          {a?.type === 'meal_swap' && <OwnerTag who="olgica" />}
          {a?.type === 'workout_swap' && <OwnerTag who="ognjen" />}
          {a?.type === 'escalation' && (
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-extrabold uppercase',
                a.urgency === 'high' ? 'border border-danger text-danger' : 'bg-line text-ink',
              )}
            >
              Eskalacija
            </span>
          )}
        </span>
      </div>
      {p.question && (
        <p className="mt-3">
          <span className="text-sm font-bold text-muted">Pitanje klijenta</span>
          <span className="block">{p.question}</span>
        </p>
      )}
      <p className="mt-3">
        <span className="text-sm font-bold text-brand-text">Asistent je odgovorio</span>
        <span className="block whitespace-pre-line">{p.body}</span>
      </p>
      <div className="mt-3 rounded-card bg-bg p-4">
        <Proposal p={p} />
      </div>
      {p.reviewed_at ? (
        <p className="mt-3 font-bold">
          {p.review_result ? RESULT_LABEL[p.review_result] : 'Obrađeno'} · {when(p.reviewed_at)}
        </p>
      ) : (
        <ReviewForm p={p} />
      )}
    </li>
  )
}

/** Pitanja (tim): predlozi asistenta za potvrdu (odobri, izmeni, odbij) i eskalacije. */
export default function TeamQuestions() {
  const proposals = useTeamProposals()
  const [tab, setTab] = useState<Tab>('pending')
  const all = proposals.data ?? []
  const pending = all.filter((p) => !p.reviewed_at)
  const list =
    tab === 'pending'
      ? [...pending].sort((x, y) => rank(x) - rank(y) || x.created_at.localeCompare(y.created_at))
      : all.filter((p) => p.reviewed_at)

  return (
    <Page>
      <h1 className="text-4xl font-extrabold">Pitanja</h1>
      <p className="mt-2 text-muted">
        Asistent odgovara odmah. Zamene važe tek kad ih potvrdite; eskalacije traže odgovor tima.
      </p>

      <div role="group" aria-label="Filter" className="mt-5 flex gap-2">
        <ChoiceChip selected={tab === 'pending'} onClick={() => setTab('pending')}>
          Čeka potvrdu ({pending.length})
        </ChoiceChip>
        <ChoiceChip selected={tab === 'done'} onClick={() => setTab('done')}>
          Obrađeno
        </ChoiceChip>
      </div>

      {proposals.isPending && <Loading />}
      {proposals.isError && <ErrorNote>Predlozi se nisu učitali. Osveži stranicu.</ErrorNote>}
      {proposals.isSuccess && list.length === 0 && (
        <p className="mt-6 text-muted">
          {tab === 'pending' ? 'Nema predloga koji čekaju potvrdu.' : 'Još nema obrađenih predloga.'}
        </p>
      )}
      <ul className="mt-5 flex flex-col gap-4">
        {list.map((p) => (
          <Card key={p.id} p={p} />
        ))}
      </ul>
    </Page>
  )
}
