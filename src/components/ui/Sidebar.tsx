import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Avatar } from './Avatar'

export interface SidebarItem {
  to: string
  label: string
  icon: ReactNode
  count?: number
}

/** Levi sidebar, samo od 1024px naviše. */
export function Sidebar({
  title,
  items,
  user,
}: {
  title: string
  items: SidebarItem[]
  user: { name: string; role: string; tone: 'olgica' | 'ognjen' | 'client' }
}) {
  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-r border-line p-6 lg:flex">
      <div className="mb-8">
        {/* Privremeni logotip dok ne stigne SVG */}
        <p className="text-4xl font-extrabold italic tracking-tight">TTZ</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted">{title}</p>
      </div>
      <nav aria-label="Glavna navigacija" className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex min-h-btn items-center gap-3 rounded-full px-4 text-base font-bold',
                isActive ? 'bg-brand text-ink' : 'text-ink',
              )
            }
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.count !== undefined && (
              <span className="text-sm font-semibold text-muted">{item.count}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex items-center gap-3 rounded-card bg-card p-3">
        <Avatar name={user.name} tone={user.tone} />
        <div>
          <p className="font-bold">{user.name}</p>
          <p className="text-sm text-muted">{user.role}</p>
        </div>
      </div>
    </aside>
  )
}
