import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { statusOf } from '@/lib/teamStatus'

/** Okvir stranice tima: širina i razmak su isti na svim ekranima. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn('mx-auto w-full max-w-3xl px-6 pt-8', className)}>{children}</main>
}

export function Section({
  title,
  right,
  children,
  className,
}: {
  title: string
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-card-lg bg-card p-6', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">{title}</h2>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

const OWNER = {
  olgica: 'bg-brand text-ink',
  ognjen: 'bg-ink text-white',
} as const

/** Oznaka ko je zadužen za deo plana (Olgica zelena, Ognjen crna). */
export function OwnerTag({ who }: { who: keyof typeof OWNER }) {
  return (
    <span className={cn('rounded-full px-3 py-1 text-xs font-extrabold uppercase', OWNER[who])}>
      {who === 'olgica' ? 'Olgica' : 'Ognjen'}
    </span>
  )
}

const TONES = {
  lime: 'bg-brand text-ink',
  black: 'bg-ink text-white',
  danger: 'border border-danger text-danger',
  gray: 'bg-line text-ink',
} as const

export function StatusPill({ status, suffix }: { status: string | null; suffix?: string }) {
  const { label, tone } = statusOf(status)
  return (
    <span
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-extrabold',
        TONES[tone],
      )}
    >
      {label}
      {suffix ? ` ${suffix}` : ''}
    </span>
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

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-1.5 text-base sm:grid-cols-[170px_1fr]">
      <dt className="text-muted">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  )
}
