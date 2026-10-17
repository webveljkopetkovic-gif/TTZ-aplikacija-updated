import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAskAssistant, useMyMessages, type ChatMessage } from '@/api/assistant'
import { ApiError } from '@/api/functions'
import { ErrorNote, Loading } from '@/components/client/ui'
import { Avatar } from '@/components/ui'
import { SendIcon, SparkleIcon } from '@/components/ui/icons'
import { useMyProgram } from '@/hooks/useMyProgram'
import { reviewStatus, type ReviewStatus } from '@/lib/assistantView'
import { cn } from '@/lib/cn'

const QUICK = [
  { label: 'Zamena obroka', text: 'Želim zamenu za obrok: ', training: false },
  { label: 'Suplementi', text: 'Pitanje o suplementima: ', training: false },
  { label: 'Vežba ne prija', text: 'Vežba mi ne prija: ', training: true },
]

function StatusLine({ status }: { status: ReviewStatus }) {
  return (
    <p className="mt-3 flex items-center gap-2 text-sm text-muted">
      {status.who === 'team' ? (
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-chart" />
      ) : (
        <Avatar
          name={status.who === 'olgica' ? 'Olgica' : 'Ognjen'}
          tone={status.who}
          size="sm"
        />
      )}
      {status.text}
    </p>
  )
}

function Bubble({ m }: { m: ChatMessage }) {
  if (m.sender === 'client') {
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-line rounded-[24px] bg-line px-5 py-3 text-lg">
          {m.body}
        </p>
      </li>
    )
  }
  const status = reviewStatus(m)
  const action = m.proposed_action
  const approvedMeal =
    action?.type === 'meal_swap' && m.review_result && m.review_result !== 'rejected'
  return (
    <li className="max-w-[88%]">
      <p className="mb-1 ml-3 text-sm font-extrabold text-brand-text">
        {m.sender === 'team' ? 'Tim' : 'Asistent'}
      </p>
      <div className="rounded-[24px] bg-card px-5 py-4 text-lg">
        <p className="whitespace-pre-line">{m.body}</p>
        {approvedMeal && action.type === 'meal_swap' && (
          <p className="mt-2 text-base">
            Nova zamena: <strong>{action.title}</strong>
          </p>
        )}
        {action?.type === 'meal_swap' && (
          <Link
            to={`/app/ishrana?dan=${action.plan_day}`}
            className="mt-3 inline-flex min-h-btn items-center rounded-full bg-brand px-5 font-extrabold text-ink"
          >
            Otvori plan za dan {action.plan_day}
          </Link>
        )}
        {status && <StatusLine status={status} />}
      </div>
    </li>
  )
}

/** Pitanja (design/Pitanja + AI asistent.png): asistent odgovara odmah, izmene plana potvrđuje tim. */
export default function Questions() {
  const my = useMyProgram()
  const messages = useMyMessages(my.userId)
  const ask = useAskAssistant(my.userId)
  const [text, setText] = useState('')
  const [remaining, setRemaining] = useState<number>()
  const input = useRef<HTMLInputElement>(null)
  const end = useRef<HTMLDivElement>(null)
  const canAsk = my.program?.status === 'active'

  const count = messages.data?.length ?? 0
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' })
  }, [count, ask.isPending])

  function send(e: FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || ask.isPending) return
    ask.mutate(body, {
      onSuccess: (r) => {
        setText('')
        setRemaining(r.remaining)
      },
    })
  }

  function quick(starter: string) {
    setText(starter)
    input.current?.focus()
  }

  const error =
    ask.error instanceof ApiError ? ask.error.message : ask.error ? 'Pitanje nije poslato. Pokušaj ponovo.' : null

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col">
      <header className="flex items-center gap-3 rounded-b-[36px] bg-card px-6 pb-6 pt-10">
        <Link
          to="/app/danas"
          aria-label="Nazad"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand">
          <SparkleIcon />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold">Pitanja</h1>
          <p className="text-muted">Asistent odgovara odmah, tim proverava</p>
        </div>
      </header>

      <div className="px-4 pt-5">
        {messages.isPending && <Loading />}
        {messages.isError && <ErrorNote>Poruke se nisu učitale. Osveži stranicu.</ErrorNote>}
        {messages.isSuccess && count === 0 && (
          <p className="rounded-card bg-card p-5 text-muted">
            Pitaj šta te zanima o planu ishrane{my.withTraining ? ', vežbama' : ''} ili
            suplementima. Svaku izmenu plana potvrđuje tim.
          </p>
        )}
        <ul className="flex flex-col gap-4" aria-live="polite">
          {messages.data?.map((m) => <Bubble key={m.id} m={m} />)}
          {ask.isPending && (
            <>
              <li className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-line rounded-[24px] bg-line px-5 py-3 text-lg">
                  {ask.variables}
                </p>
              </li>
              <li role="status" className="ml-3 text-muted">
                Asistent piše…
              </li>
            </>
          )}
        </ul>
        <div ref={end} />
      </div>

      {canAsk ? (
        <div className="sticky bottom-24 mt-6 lg:bottom-0">
          <div className="flex gap-2 overflow-x-auto px-4 pb-3">
            {QUICK.filter((q) => !q.training || my.withTraining).map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => quick(q.text)}
                className="min-h-btn shrink-0 rounded-full border-2 border-line bg-bg px-5 font-extrabold"
              >
                {q.label}
              </button>
            ))}
          </div>
          <form onSubmit={send} className="flex items-center gap-3 rounded-t-[36px] bg-card px-4 py-4">
            <label htmlFor="question" className="sr-only">
              Postavi pitanje
            </label>
            <input
              id="question"
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              placeholder="Postavi pitanje…"
              autoComplete="off"
              className="min-h-[52px] min-w-0 flex-1 rounded-full bg-line px-5 text-lg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-chart"
            />
            <button
              type="submit"
              aria-label="Pošalji"
              disabled={ask.isPending || !text.trim()}
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-ink',
                (ask.isPending || !text.trim()) && 'opacity-60',
              )}
            >
              <SendIcon />
            </button>
          </form>
          {(error || (remaining !== undefined && remaining <= 5)) && (
            <div className="bg-card px-6 pb-4">
              {error && <ErrorNote>{error}</ErrorNote>}
              {!error && remaining !== undefined && remaining <= 5 && (
                <p className="text-sm text-muted">Preostalo pitanja za danas: {remaining}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="m-4 rounded-card bg-card p-5 text-muted">
          Program je završen, pa asistent više ne prima pitanja. Poruke ostaju ovde za čitanje.
        </p>
      )}
    </main>
  )
}
