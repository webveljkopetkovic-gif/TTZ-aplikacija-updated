import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserRole } from '@/lib/roles'
import { RequireRole } from './RequireRole'

const state = vi.hoisted(() => ({
  session: { isPending: false, data: null as null | { user: { id: string } } },
  profile: { isPending: false, isError: false, data: null as null | { role: UserRole } },
}))

vi.mock('@/api/auth', () => ({
  useSession: () => state.session,
  useProfile: () => state.profile,
}))

function renderAt(path: string, allow: UserRole[]) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/prijava" element={<p>PRIJAVA</p>} />
        <Route path="/app" element={<p>KLIJENT</p>} />
        <Route path="/tim" element={<p>TIM</p>} />
        <Route path="/partner" element={<RequireRole allow={allow}>PARTNER</RequireRole>} />
        <Route path="/zasticeno" element={<RequireRole allow={allow}>ZASTICENO</RequireRole>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  state.session = { isPending: false, data: { user: { id: 'u1' } } }
  state.profile = { isPending: false, isError: false, data: { role: 'client' } }
})

describe('RequireRole', () => {
  it('neprijavljenog šalje na /prijava', () => {
    state.session = { isPending: false, data: null }
    renderAt('/zasticeno', ['client'])
    expect(screen.getByText('PRIJAVA')).toBeInTheDocument()
  })

  it('pušta korisnika sa dozvoljenom ulogom', () => {
    renderAt('/zasticeno', ['client'])
    expect(screen.getByText('ZASTICENO')).toBeInTheDocument()
  })

  it('klijenta na tim ruti vraća na /app', () => {
    renderAt('/zasticeno', ['nutritionist', 'trainer', 'admin'])
    expect(screen.getByText('KLIJENT')).toBeInTheDocument()
  })

  it('olgicu (nutritionist) na klijentskoj ruti vraća na /tim', () => {
    state.profile.data = { role: 'nutritionist' }
    renderAt('/zasticeno', ['client'])
    expect(screen.getByText('TIM')).toBeInTheDocument()
  })

  it('čeka učitavanje sesije i profila bez preusmeravanja', () => {
    state.session = { isPending: true, data: null }
    renderAt('/zasticeno', ['client'])
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('PRIJAVA')).not.toBeInTheDocument()
  })

  it('partner prolazi na /partner, a klijent ne', () => {
    state.profile.data = { role: 'partner' }
    renderAt('/partner', ['partner', 'admin'])
    expect(screen.getByText('PARTNER')).toBeInTheDocument()
  })
})
