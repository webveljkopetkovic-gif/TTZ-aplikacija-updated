import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  my: {} as Record<string, unknown>,
  report: null as Record<string, unknown> | null,
}))

vi.mock('@/hooks/useMyProgram', () => ({ useMyProgram: () => state.my }))
vi.mock('@/api/auth', () => ({ useSignOut: () => ({ mutate: vi.fn() }) }))
vi.mock('@/api/products', () => ({
  formatRsd: (n: number) => `${n} RSD`,
  useProducts: () => ({
    data: [
      { id: 'n', kind: 'nutrition', name: 'Ishrana', price_rsd: 7900, duration_days: 30 },
      {
        id: 't',
        kind: 'nutrition_training',
        name: 'Ishrana + vežbe',
        price_rsd: 12900,
        duration_days: 30,
      },
    ],
  }),
}))
vi.mock('@/api/end', () => ({
  openReportPdf: vi.fn(),
  useProgramResults: () => ({
    isPending: false,
    data: {
      duration_days: 30,
      start_weight_kg: 70.5,
      end_weight_kg: 67.6,
      start_waist_cm: 82,
      end_waist_cm: 78,
      followed_days: 27,
      workouts_done: 13,
      feedbacks_done: 3,
      full_cycles: 2,
    },
  }),
  useProgramReport: () => ({ data: state.report }),
  useRenewProgram: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

import End from './End'

function program(status: string, day: number, kind = 'nutrition_training') {
  return {
    isPending: false,
    day,
    duration: 30,
    profile: { full_name: 'Ana Marković' },
    program: { id: 'p1', status, products: { kind } },
  }
}

const renderEnd = () =>
  render(
    <MemoryRouter>
      <End />
    </MemoryRouter>,
  )

beforeEach(() => {
  state.report = null
})

describe('Kraj programa', () => {
  it('dan 30: rezultati, rečenica o programu i ponuda sa cenama i preporukom', () => {
    state.my = program('active', 30)
    renderEnd()
    expect(
      screen.getByRole('heading', { name: 'Bravo, Ana! Program je završen.' }),
    ).toBeInTheDocument()
    expect(screen.getByText('3 feedbacka, 2 kruga plana i 13 treninga.')).toBeInTheDocument()
    expect(screen.getByText('−2,9 kg')).toBeInTheDocument()
    expect(screen.getByText('−4 cm')).toBeInTheDocument()
    expect(screen.getByText('27/30 d')).toBeInTheDocument()
    const cont = screen.getByRole('radio', { name: /Nastavi 30 dana/ })
    expect(cont).toHaveAttribute('aria-checked', 'true')
    expect(cont).toHaveTextContent('PREPORUKA')
    expect(cont).toHaveTextContent('12900 RSD')
    expect(screen.getByRole('radio', { name: /Samo ishrana · 30 dana/ })).toHaveTextContent(
      '7900 RSD',
    )
  })

  it('dan 29: još jedan dan do kraja, a ponuda je otvorena', () => {
    state.my = program('active', 29)
    renderEnd()
    expect(screen.getByRole('heading', { name: 'Još 1 dan do kraja, Ana!' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nastavi program' })).toBeInTheDocument()
  })

  it('aktivan program pre dana 28 nema ovaj ekran', () => {
    state.my = program('active', 10)
    renderEnd()
    expect(screen.queryByText(/Bravo|Još/)).not.toBeInTheDocument()
  })

  it('bez objavljenog izveštaja tim još piše, a PDF nema', () => {
    state.my = program('active', 30)
    renderEnd()
    expect(screen.getByText(/pišu tvoj završni izveštaj/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Preuzmi izveštaj/ })).not.toBeInTheDocument()
  })

  it('objavljen izveštaj: beleške Olgice i Ognjena, PDF i preporuka tima', () => {
    state.my = program('ended', 31)
    state.report = {
      nutrition_note: 'Večernja glad je nestala.',
      training_note: 'Spremna si za srednji nivo.',
      recommendation: 'nutrition_only',
      pdf_path: 'c/p.pdf',
      published_at: '2026-11-03T08:00:00Z',
    }
    renderEnd()
    expect(screen.getByText(/Večernja glad je nestala/)).toBeInTheDocument()
    expect(screen.getByText(/Spremna si za srednji nivo/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preuzmi izveštaj (PDF)' })).toBeInTheDocument()
    const only = screen.getByRole('radio', { name: /Samo ishrana · 30 dana/ })
    expect(only).toHaveAttribute('aria-checked', 'true')
    expect(only).toHaveTextContent('PREPORUKA')
  })

  it('klijent samo sa ishranom nema opciju „Samo ishrana“, a Ognjenove beleške se ne prikazuju', () => {
    state.my = program('active', 30, 'nutrition')
    state.report = {
      nutrition_note: 'Sve ide dobro.',
      training_note: 'ne bi smelo da se vidi',
      recommendation: 'continue',
      pdf_path: null,
      published_at: '2026-11-03T08:00:00Z',
    }
    renderEnd()
    expect(screen.queryByRole('radio', { name: /Samo ishrana/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/ne bi smelo da se vidi/)).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Nastavi 30 dana/ })).toHaveTextContent('7900 RSD')
  })

  it('istekao pristup (dan 61+): nema povratka na plan, ali ponuda ostaje', () => {
    state.my = program('ended', 70)
    renderEnd()
    expect(screen.queryByRole('link', { name: 'Nazad' })).not.toBeInTheDocument()
    expect(screen.getByText(/Pristup planu je istekao/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nastavi program' })).toBeInTheDocument()
  })
})
