import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RevenueRow } from '@/lib/partnerRevenue'

const state = vi.hoisted(() => ({
  rows: [] as RevenueRow[],
  status: 'success' as 'success' | 'pending' | 'error',
}))

vi.mock('@/api/auth', () => ({
  useSession: () => ({ data: { user: { id: 'v1' } } }),
  useProfile: () => ({ data: { role: 'partner', full_name: 'Veljko', email: 'v@ttz.test' } }),
  useSignOut: () => ({ mutate: vi.fn() }),
}))
vi.mock('@/api/partner', () => ({
  usePartnerRevenue: () => ({
    data: state.status === 'success' ? state.rows : undefined,
    isPending: state.status === 'pending',
    isError: state.status === 'error',
    isSuccess: state.status === 'success',
  }),
}))

import Partner from './Partner'

const row = (
  month: string,
  kind: RevenueRow['kind'],
  sales: number,
  revenue_rsd: number,
): RevenueRow => ({
  month: `${month}-01T00:00:00`,
  kind,
  sales,
  revenue_rsd,
  partner_share_rsd: Math.round(revenue_rsd * 0.3),
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <Partner />
    </MemoryRouter>,
  )

const digits = (el: HTMLElement) => el.textContent?.replace(/\D/g, '')

beforeEach(() => {
  state.status = 'success'
  state.rows = [
    row('2026-10', 'nutrition', 9, 54000),
    row('2026-10', 'nutrition_training', 14, 126000),
    row('2026-09', 'nutrition', 7, 42000),
  ]
})

describe('Partner panel', () => {
  it('prikazuje udeo, bruto prodaju i broj planova za tekući mesec', () => {
    renderPage()
    const overview = screen.getByRole('region', { name: 'Pregled' })
    expect(within(overview).getByText(/Moj udeo · oktobar/)).toBeInTheDocument()
    expect(digits(overview)).toContain('54000')
    expect(digits(overview)).toContain('180000')
    expect(within(overview).getByText('23')).toBeInTheDocument()
  })

  it('izbor septembra menja brojeve, a Ukupno sabira sve mesece', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Septembar' }))
    expect(digits(screen.getByRole('region', { name: 'Pregled' }))).toContain('12600')
    await userEvent.click(screen.getByRole('button', { name: 'Ukupno' }))
    expect(screen.getByText(/Moj udeo · ukupno/)).toBeInTheDocument()
  })

  it('bez uplata objašnjava da još nema prodaje', () => {
    state.rows = []
    renderPage()
    expect(screen.getByText(/Još nema plaćenih planova/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Izvezi CSV' })).not.toBeInTheDocument()
  })

  it('greška učitavanja je javljena', () => {
    state.status = 'error'
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('Prihodi se nisu učitali')
  })

  it('ne prikazuje nijedan podatak klijenta', () => {
    renderPage()
    expect(screen.queryByText(/anketa|nalaz|dijagnoz|feedback/i)).not.toBeInTheDocument()
  })
})
