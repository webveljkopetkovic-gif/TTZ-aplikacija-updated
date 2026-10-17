import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useProfile, useSession, useSignOut } from '@/api/auth'
import { Sidebar, type SidebarItem } from '@/components/ui'
import { ClipboardIcon, FileIcon, FolderIcon, GridIcon, QuestionIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

const plus = (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
)

interface TabItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

const left: TabItem[] = [
  { to: '/tim', label: 'Pregled', icon: <GridIcon />, end: true },
  { to: '/tim/klijenti', label: 'Klijenti', icon: <FileIcon /> },
]
const right: TabItem[] = [
  { to: '/tim/feedback', label: 'Feedback', icon: <ClipboardIcon /> },
  { to: '/tim/pitanja', label: 'Pitanja', icon: <QuestionIcon /> },
]

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-btn flex-col items-center justify-center gap-1 text-xs font-bold',
    isActive ? 'text-ink' : 'text-muted',
  )

/** Donja navigacija tima (mobilni). Centralno dugme vodi na Materijale. */
function TeamTabBar() {
  return (
    <nav
      aria-label="Glavna navigacija"
      className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 items-end rounded-t-[28px] border border-line bg-card px-2 pb-4 pt-3 lg:hidden"
    >
      {left.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={tabClass}>
          {t.icon}
          {t.label}
        </NavLink>
      ))}
      <NavLink
        to="/tim/materijali"
        aria-label="Materijali"
        className="-mt-8 mb-1 flex h-14 w-14 items-center justify-center justify-self-center rounded-full bg-brand text-ink"
      >
        {plus}
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

/** Okvir konzole tima: sidebar od 1024px, donja navigacija ispod. */
export default function TeamLayout() {
  const session = useSession()
  const profile = useProfile(session.data?.user.id)
  const signOut = useSignOut()
  const role = profile.data?.role
  const name = profile.data?.full_name ?? profile.data?.email ?? ''

  const items: SidebarItem[] = [
    { to: '/tim', label: 'Pregled', icon: <GridIcon />, end: true },
    { to: '/tim/klijenti', label: 'Klijenti', icon: <FileIcon /> },
    { to: '/tim/feedback', label: 'Feedback', icon: <ClipboardIcon /> },
    { to: '/tim/pitanja', label: 'Pitanja', icon: <QuestionIcon /> },
    { to: '/tim/obavestenja', label: 'Obaveštenja', icon: <FileIcon /> },
    { to: '/tim/materijali', label: 'Materijali', icon: <FolderIcon /> },
    ...(role === 'admin' ? [{ to: '/tim/uplate', label: 'Uplate', icon: <FileIcon /> }] : []),
  ]
  const tone = role === 'trainer' ? 'ognjen' : 'olgica'
  const roleLabel =
    role === 'nutritionist'
      ? 'Ishrana'
      : role === 'trainer'
        ? 'Vežbe'
        : role === 'admin'
          ? 'Admin'
          : ''

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar title="Tim" items={items} user={{ name, role: roleLabel, tone }} />
      <div className="min-w-0 flex-1 pb-32 lg:pb-10">
        <Outlet />
        <div className="mx-auto mt-10 w-full max-w-3xl px-6">
          <button
            type="button"
            onClick={() => signOut.mutate()}
            className="min-h-btn text-sm font-bold text-muted underline"
          >
            Odjavi se
          </button>
        </div>
      </div>
      <TeamTabBar />
    </div>
  )
}
