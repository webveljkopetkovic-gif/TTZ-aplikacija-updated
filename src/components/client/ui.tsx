import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

/** Okvir klijentskog ekrana: ista širina i razmak svuda. */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn('mx-auto w-full max-w-2xl px-6 pt-8', className)}>{children}</main>
}

export function ScreenHeader({
  title,
  subtitle,
  right,
  back,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
  back?: string
}) {
  return (
    <header className="flex items-start gap-3">
      {back && (
        <Link
          to={back}
          aria-label="Nazad"
          className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card"
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
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-4xl font-extrabold leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-card-lg bg-card p-6', className)}>{children}</section>
}

export function Pill({
  children,
  tone = 'lime',
}: {
  children: ReactNode
  tone?: 'lime' | 'black' | 'gray'
}) {
  const tones = { lime: 'bg-brand text-ink', black: 'bg-ink text-white', gray: 'bg-line text-ink' }
  return (
    <span className={cn('inline-flex rounded-full px-4 py-2 text-sm font-extrabold', tones[tone])}>
      {children}
    </span>
  )
}

/** Krug za štikliranje (obrok, suplement). Dugme sa aria-pressed, da radi tastatura i čitač ekrana. */
export function CheckCircle({
  checked,
  label,
  onChange,
  disabled,
}: {
  checked: boolean
  label: string
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-11 shrink-0 items-center justify-center"
    >
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full border-2',
          checked ? 'border-chart bg-brand' : 'border-muted/50 bg-bg',
        )}
      >
        {checked && (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m5 12 5 5 9-10" />
          </svg>
        )}
      </span>
    </button>
  )
}

export function Loading() {
  return (
    <p role="status" className="py-6 text-muted">
      Učitavanje…
    </p>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="py-3 font-semibold text-danger">
      {children}
    </p>
  )
}
