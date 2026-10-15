import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useProfile, useSession } from '@/api/auth'
import { ApiError } from '@/api/functions'
import { useTeamFeedbacks, useTeamReply, type TeamFeedbackRow } from '@/api/feedback'
import { AnswerList, exerciseLabel, foodLabel } from '@/components/client/feedbackParts'
import { ErrorNote, Loading, Page } from '@/components/team/ui'
import { Chip, ChoiceChip } from '@/components/ui'
import { cn } from '@/lib/cn'
import { feedbackTags, needsAttention, type StoredAnswers } from '@/lib/feedbackSchema'
import { relativeDay, replyCountdown } from '@/lib/feedbackView'
import { findMealRuleViolation } from '@/lib/mealRules'

type Tab = 'waiting' | 'answered' | 'late'
type Channel = 'whatsapp' | 'email'

const TABS: { value: Tab; label: string }[] = [
  { value: 'waiting', label: 'Čeka' },
  { value: 'answered', label: 'Odgovoreno' },
  { value: 'late', label: 'Kasni' },
]

const STATUS_OF: Record<Tab, string> = { waiting: 'submitted', answered: 'answered', late: 'late' }

const QUICK = [
  { label: '+ Zameni namirnicu u planu', text: 'Namirnicu koja ti smeta menjamo: ' },
  { label: '+ Dodaj užinu', text: 'Za večernju glad dodajemo užinu: ' },
  { label: '+ Suplement', text: 'Dodajemo suplement: ' },
]

const clientName = (f: TeamFeedbackRow) => f.programs.profiles?.full_name ?? 'Klijent'

const dec = (n: number | null | undefined, unit = '') =>
  typeof n === 'number' ? `${String(n).replace('.', ',')}${unit}` : '—'

/** Prethodni feedback istog programa sa odgovorima (za poređenje i pad energije). */
function previousOf(f: TeamFeedbackRow, all: TeamFeedbackRow[]) {
  return all
    .filter((x) => x.program_id === f.program_id && x.due_day < f.due_day && x.answers)
    .sort((a, b) => b.due_day - a.due_day)[0]
}

function Compare({
  f,
  prev,
  training,
}: {
  f: TeamFeedbackRow
  prev?: TeamFeedbackRow
  training: boolean
}) {
  const a = (f.answers ?? {}) as Partial<StoredAnswers>
  const p = (prev?.answers ?? null) as Partial<StoredAnswers> | null
  const energyDown =
    typeof a.energy_am === 'number' && typeof p?.energy_am === 'number' && a.energy_am < p.energy_am
  const kg =
    typeof a.weight_kg === 'number' && typeof p?.weight_kg === 'number'
      ? Math.round((a.weight_kg - p.weight_kg) * 10) / 10
      : null
  const list = (tags: string[] | undefined, label: (t: string) => string, text?: string) =>
    [tags?.map(label).join(', '), text].filter(Boolean).join(' — ') || '—'

  const rows: { q: string; before: string; now: string; bad?: boolean }[] = [
    {
      q: 'Kako se oseća',
      before: p?.general ? `${p.general}/5` : '—',
      now: a.general ? `${a.general}/5` : '—',
    },
    {
      q: 'Energija ujutru',
      before: p?.energy_am ? `${p.energy_am}/5` : '—',
      now: a.energy_am ? `${a.energy_am}/5${energyDown ? ' ↓' : ''}` : '—',
      bad: energyDown,
    },
    {
      q: 'Ishrana smeta',
      before: list(p?.food_tags, foodLabel, p?.food_text),
      now: list(a.food_tags, foodLabel, a.food_text),
    },
    ...(training
      ? [
          {
            q: 'Vežbe',
            before: list(p?.exercise_tags, exerciseLabel, p?.exercise_text),
            now: list(a.exercise_tags, exerciseLabel, a.exercise_text),
            bad: (a.exercise_tags ?? []).some((t) => t.startsWith('pain')),
          },
        ]
      : []),
    { q: 'Izazovi', before: p?.challenges || '—', now: a.challenges || '—' },
    {
      q: 'Težina',
      before: dec(p?.weight_kg, ' kg'),
      now: `${dec(a.weight_kg, ' kg')}${kg !== null && kg !== 0 ? ` (${kg > 0 ? '+' : '−'}${String(Math.abs(kg)).replace('.', ',')})` : ''}`,
    },
  ]

  return (
    <div className="overflow-x-auto rounded-card-lg bg-card p-5">
      <table className="w-full min-w-[460px] text-left">
        <thead>
          <tr className="border-b border-line text-sm text-muted">
            <th className="py-2 pr-3 font-semibold">Pitanje</th>
            <th className="py-2 pr-3 font-semibold">{prev ? `Dan ${prev.due_day}` : 'Ranije'}</th>
            <th className="py-2 font-semibold">Dan {f.due_day}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.q} className="border-b border-line last:border-0">
              <th scope="row" className="py-3 pr-3 align-top font-semibold">
                {r.q}
              </th>
              <td className="py-3 pr-3 align-top text-muted">{r.before}</td>
              <td className={cn('py-3 align-top font-extrabold', r.bad && 'text-danger')}>
                {r.now}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReplyBox({ f }: { f: TeamFeedbackRow }) {
  const reply = useTeamReply()
  const answers = f.answers as Partial<StoredAnswers> | null
  const wanted = (answers?.reply_channels ?? ['whatsapp', 'email']).filter(
    (c): c is Channel => c === 'whatsapp' || c === 'email',
  )
  const [body, setBody] = useState('')
  const [channels, setChannels] = useState<Channel[]>(wanted.length > 0 ? wanted : ['email'])
  const [error, setError] = useState<string>()
  const countdown = replyCountdown(f.submitted_at)

  if (f.status === 'answered') {
    return (
      <section className="rounded-card-lg bg-card p-6">
        <h2 className="text-xl font-extrabold">Odgovor je poslat</h2>
        {f.feedback_replies.map((r) => (
          <div key={r.id} className="mt-3 rounded-card bg-bg p-4">
            <p className="whitespace-pre-line">{r.body}</p>
            <p className="mt-2 text-sm text-muted">
              Poslato na{' '}
              {r.sent_channels.map((c) => (c === 'whatsapp' ? 'WhatsApp' : 'Email')).join(' + ')}
            </p>
          </div>
        ))}
      </section>
    )
  }
  if (f.status !== 'submitted') {
    return (
      <p className="rounded-card-lg bg-card p-6 text-muted">
        Klijent još nije poslao feedback. Odgovor je moguć kad ga pošalje.
      </p>
    )
  }

  const send = async () => {
    setError(undefined)
    if (body.trim() === '') return setError('Upiši odgovor')
    const violation = findMealRuleViolation(body)
    if (violation) return setError(`${violation}. Opiši bez brojeva i mera.`)
    if (channels.length === 0) return setError('Izaberi bar jedan kanal')
    try {
      await reply.mutateAsync({ feedback_id: f.id, body: body.trim(), channels })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Odgovor nije poslat. Pokušaj ponovo.')
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <section className="rounded-card-lg bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold">Tvoj odgovor</h2>
          {countdown && (
            <p
              className={cn('text-sm font-bold', countdown.overdue ? 'text-danger' : 'text-muted')}
            >
              {countdown.overdue
                ? `Rok od 48 h je prošao pre ${countdown.hours} h`
                : `Rok za odgovor: još ${countdown.hours} h`}
            </p>
          )}
        </div>
        <label htmlFor="reply-body" className="sr-only">
          Odgovor klijentu
        </label>
        <textarea
          id="reply-body"
          rows={6}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Odgovor ide klijentu porukom (bez grama i kalorija)."
          className="mt-3 w-full resize-y rounded-[22px] border border-line bg-bg px-5 py-4 text-base"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => setBody((b) => `${b}${b && !b.endsWith('\n') ? '\n' : ''}${q.text}`)}
              className="min-h-btn rounded-full border border-line bg-bg px-4 text-sm font-bold"
            >
              {q.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          Izmenu u planu napravi u{' '}
          <Link
            to={`/tim/klijenti/${f.programs.client_id}/plan`}
            className="font-bold text-brand-text underline"
          >
            planu klijenta
          </Link>
          , pa je opiši ovde.
        </p>
      </section>

      <section className="rounded-card-lg bg-card p-6">
        <p className="font-bold text-muted">Šalje se na</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['whatsapp', 'email'] as const).map((c) => (
            <ChoiceChip
              key={c}
              selected={channels.includes(c)}
              onClick={() =>
                setChannels((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))
              }
              className="min-h-[48px]"
            >
              {channels.includes(c) ? '✓ ' : ''}
              {c === 'whatsapp' ? 'WhatsApp' : 'Email'}
            </ChoiceChip>
          ))}
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <button
          type="button"
          disabled={reply.isPending}
          onClick={() => void send()}
          className="mt-4 min-h-[56px] w-full rounded-full bg-brand px-5 text-lg font-extrabold text-ink disabled:opacity-50"
        >
          {reply.isPending ? 'Šaljem…' : 'Pošalji i označi pregledano'}
        </button>
      </section>
    </div>
  )
}

/** Pregled feedbacka i odgovor (design/Web – tim feedback i odgovor.png, Pregled feedbacka i odgovor.png). */
export default function TeamFeedback() {
  const { id } = useParams()
  const navigate = useNavigate()
  const session = useSession()
  const role = useProfile(session.data?.user.id).data?.role
  const feedbacks = useTeamFeedbacks()
  const [tab, setTab] = useState<Tab>('waiting')

  const all = useMemo(() => {
    const rows = feedbacks.data ?? []
    // Ognjen vidi samo klijente sa vežbama, Olgica sve (svi imaju ishranu)
    return role === 'trainer'
      ? rows.filter((r) => r.programs.products?.kind === 'nutrition_training')
      : rows
  }, [feedbacks.data, role])

  const inTab = (t: Tab) => all.filter((f) => f.status === STATUS_OF[t])
  const visible = inTab(tab).sort((a, b) =>
    tab === 'answered'
      ? (b.submitted_at ?? '').localeCompare(a.submitted_at ?? '')
      : (a.submitted_at ?? a.due_date).localeCompare(b.submitted_at ?? b.due_date),
  )
  const selected = all.find((f) => f.id === id)
  const prev = selected ? previousOf(selected, feedbacks.data ?? []) : undefined

  return (
    <Page wide>
      <h1 className="text-4xl font-extrabold">Feedback</h1>
      <p className="mt-1 text-muted">Odgovor klijentu je u roku od 48 sati</p>

      {feedbacks.isPending && <Loading />}
      {feedbacks.isError && <ErrorNote>Feedback se nije učitao. Osveži stranicu.</ErrorNote>}

      <div className="mt-5 grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className={cn(selected && 'hidden lg:block')}>
          <div role="tablist" aria-label="Status feedbacka" className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const n = inTab(t.value).length
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.value}
                  onClick={() => setTab(t.value)}
                  className={cn(
                    'min-h-btn rounded-full px-5 text-base font-bold',
                    tab === t.value ? 'bg-brand text-ink' : 'bg-card text-ink',
                  )}
                >
                  {t.label}
                  {t.value !== 'answered' || n > 0 ? ` ${n}` : ''}
                </button>
              )
            })}
          </div>

          <ul className="mt-4 rounded-card-lg bg-card p-2">
            {visible.map((f) => {
              const p = previousOf(f, feedbacks.data ?? [])
              const tags = feedbackTags(f.answers, p?.answers)
              const attention = needsAttention(f.answers, p?.answers)
              return (
                <li key={f.id}>
                  <Link
                    to={`/tim/feedback/${f.id}`}
                    aria-current={f.id === id ? 'true' : undefined}
                    className={cn(
                      'block rounded-card p-4',
                      f.id === id && 'border-2 border-brand bg-line/60',
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-lg font-extrabold">{clientName(f)}</span>
                      <span className="shrink-0 text-sm text-muted">
                        dan {f.due_day}
                        {f.submitted_at ? ` · ${relativeDay(f.submitted_at)}` : ''}
                      </span>
                    </span>
                    <span className="mt-2 flex flex-wrap gap-2">
                      {tags.map((t) => (
                        <Chip
                          key={t.label}
                          tone={t.tone}
                          className="px-3 py-1 text-xs font-extrabold uppercase"
                        >
                          {t.label}
                        </Chip>
                      ))}
                      {attention && <span className="sr-only">Traži pažnju</span>}
                      {tab === 'late' && (
                        <Chip tone="outline" className="px-3 py-1 text-xs font-extrabold uppercase">
                          Nije poslao/la
                        </Chip>
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
            {feedbacks.isSuccess && visible.length === 0 && (
              <li className="p-4 text-muted">
                {tab === 'waiting'
                  ? 'Nema feedbacka koji čekaju odgovor.'
                  : tab === 'answered'
                    ? 'Još nema odgovorenih feedbacka.'
                    : 'Niko ne kasni.'}
              </li>
            )}
          </ul>
        </div>

        <div className={cn(!selected && 'hidden lg:block')}>
          {selected ? (
            <article className="flex flex-col gap-4">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <button
                    type="button"
                    onClick={() => navigate('/tim/feedback')}
                    className="mb-2 min-h-btn font-bold text-brand-text underline lg:hidden"
                  >
                    ← Lista
                  </button>
                  <h2 className="text-3xl font-extrabold leading-tight">
                    {clientName(selected)} · feedback dan {selected.due_day}
                  </h2>
                  <p className="text-muted">
                    {[
                      selected.programs.plan_focus,
                      selected.programs.products?.kind === 'nutrition_training'
                        ? 'ishrana + vežbe'
                        : 'ishrana',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <Link
                  to={`/tim/klijenti/${selected.programs.client_id}`}
                  className="inline-flex min-h-btn items-center rounded-full bg-card px-5 font-extrabold"
                >
                  Otvori dosije
                </Link>
              </header>

              {selected.answers ? (
                <>
                  <Compare
                    f={selected}
                    prev={prev}
                    training={selected.programs.products?.kind === 'nutrition_training'}
                  />
                  <details className="rounded-card-lg bg-card p-5">
                    <summary className="min-h-btn cursor-pointer font-bold">Svi odgovori</summary>
                    <AnswerList answers={selected.answers} />
                  </details>
                </>
              ) : (
                <p className="rounded-card-lg bg-card p-6 text-muted">
                  Klijent još nije poslao ovaj feedback.
                </p>
              )}
              <ReplyBox key={selected.id + selected.status} f={selected} />
            </article>
          ) : (
            <p className="hidden rounded-card-lg bg-card p-6 text-muted lg:block">
              Izaberi feedback sa liste.
            </p>
          )}
        </div>
      </div>
    </Page>
  )
}
