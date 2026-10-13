import type { FormEventHandler, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'

const SAVE_NOTE = 'Odgovori se čuvaju dok popunjavaš. Možeš da nastaviš kasnije.'

/** Okvir koraka ankete: nazad, progres 1–5, naslov sa zelenim akcentom, dugme pri dnu. */
export function AnketaLayout({
  step,
  title,
  accent,
  note = SAVE_NOTE,
  nextLabel = 'Nastavi',
  submitting,
  onSubmit,
  children,
}: {
  step: 1 | 2 | 3 | 4 | 5
  title: string
  accent: string
  note?: string
  nextLabel?: string
  submitting?: boolean
  onSubmit: FormEventHandler<HTMLFormElement>
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-bg">
      <main className="mx-auto flex min-h-screen w-full max-w-[640px] flex-col px-6 pt-6 lg:min-h-0 lg:py-10">
        <div className="flex items-center gap-4">
          <Link
            to={step === 1 ? '/' : `/anketa/${step - 1}`}
            aria-label="Nazad"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card"
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
          <div className="flex-1">
            <p className="text-sm font-bold text-muted">Anketa · korak {step} od 5</p>
            <div
              role="progressbar"
              aria-label="Napredak ankete"
              aria-valuemin={1}
              aria-valuemax={5}
              aria-valuenow={step}
              className="mt-2 flex gap-2"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={cn('h-1.5 flex-1 rounded-full', n <= step ? 'bg-chart' : 'bg-line')}
                />
              ))}
            </div>
          </div>
        </div>

        <form
          noValidate
          onSubmit={onSubmit}
          className="flex flex-1 flex-col lg:mt-8 lg:flex-none lg:rounded-card-lg lg:border lg:border-line lg:p-8"
        >
          <h1 className="mt-6 text-4xl font-extrabold leading-tight lg:mt-0">
            {title} <span className="text-brand-text">{accent}</span>
          </h1>

          <div className="mt-6 flex flex-col gap-7">{children}</div>

          <p className="mt-8 text-sm text-muted">{note}</p>

          <div className="sticky bottom-0 -mx-6 mt-auto bg-bg px-6 pb-6 pt-4 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-0">
            <Button
              type="submit"
              block
              disabled={submitting}
              className="min-h-[56px] text-lg font-extrabold"
            >
              {submitting ? 'Slanje…' : nextLabel}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
