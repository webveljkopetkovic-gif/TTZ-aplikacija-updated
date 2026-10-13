import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { ClipboardIcon, DumbbellIcon, HomeIcon, LeafIcon, QuestionIcon } from './icons'

const left: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/app/danas', label: 'Početna', icon: <HomeIcon /> },
  { to: '/app/ishrana', label: 'Ishrana', icon: <LeafIcon /> },
]
const right: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/app/vezbe', label: 'Vežbe', icon: <DumbbellIcon /> },
  { to: '/app/pitanja', label: 'Pitanja', icon: <QuestionIcon /> },
]

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-btn flex-col items-center justify-center gap-1 text-xs font-bold',
    isActive ? 'text-ink' : 'text-muted',
  )

/** Donja navigacija, samo ispod 1024px. Centralno dugme vodi na tok programa. */
export function TabBar() {
  return (
    <nav
      aria-label="Glavna navigacija"
      className="grid grid-cols-5 items-end rounded-t-[28px] border border-line bg-card px-2 pb-4 pt-3 lg:hidden"
    >
      {left.map((t) => (
        <NavLink key={t.to} to={t.to} className={tabClass}>
          {t.icon}
          {t.label}
        </NavLink>
      ))}
      <NavLink
        to="/app/tok"
        aria-label="Tok programa"
        className="-mt-8 mb-1 flex h-14 w-14 items-center justify-center justify-self-center rounded-full bg-brand text-ink"
      >
        <ClipboardIcon />
      </NavLink>
      {right.map((t) => (
        <NavLink key={t.to} to={t.to} className={tabClass}>
          {t.icon}
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
