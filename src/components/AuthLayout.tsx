import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Okvir za prijavu, zaboravljenu i novu lozinku (po design/Prijava.png). */
export function AuthLayout({
  title,
  accent,
  subtitle,
  children,
}: {
  title: string
  accent: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 pt-6">
      <Link
        to="/prijava"
        aria-label="Nazad"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-card"
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
      <h1 className="mt-8 text-4xl font-extrabold leading-tight">
        {title} <span className="text-brand-text">{accent}</span>
      </h1>
      {subtitle && <p className="mt-2 text-lg text-muted">{subtitle}</p>}
      <div className="mt-8 flex flex-1 flex-col">{children}</div>
    </main>
  )
}
