import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessage } from '@/api/assistant'
import { reviewStatus } from '@/lib/assistantView'

const state = vi.hoisted(() => ({
  my: {} as Record<string, unknown>,
  messages: [] as ChatMessage[],
  mutate: vi.fn(),
}))

vi.mock('@/hooks/useMyProgram', () => ({ useMyProgram: () => state.my }))
vi.mock('@/api/assistant', () => ({
  useMyMessages: () => ({ data: state.messages, isPending: false, isError: false, isSuccess: true }),
  useAskAssistant: () => ({ mutate: state.mutate, isPending: false, error: null }),
}))

import Questions from './Questions'

const msg = (over: Partial<ChatMessage>): ChatMessage => ({
  id: Math.random().toString(36),
  sender: 'assistant',
  body: 'Odgovor',
  proposed_action: null,
  needs_team_review: false,
  review_result: null,
  created_at: '2026-10-17T08:00:00Z',
  ...over,
})

const mealSwap = {
  type: 'meal_swap' as const,
  plan_day: 6,
  slot: 'lunch' as const,
  title: 'Ćuretina sa povrćem',
  reason: 'Ne voli ribu',
}

function setup(withTraining = true, status = 'active') {
  state.my = { userId: 'u1', program: { id: 'p1', status }, withTraining }
}

beforeEach(() => {
  state.messages = []
  state.mutate.mockReset()
  setup()
})

describe('oznake potvrde tima', () => {
  it('zamena obroka čeka Olgicu, pa je potvrđena', () => {
    const m = msg({ proposed_action: mealSwap, needs_team_review: true })
    expect(reviewStatus(m)?.text).toBe('Čeka potvrdu Olgice')
    expect(reviewStatus({ ...m, review_result: 'edited' })?.text).toBe('Olgica je potvrdila')
    expect(reviewStatus({ ...m, review_result: 'rejected' })?.text).toBe('Olgica nije odobrila zamenu')
  })

  it('zamena vežbe čeka Ognjena; običan odgovor nema oznaku', () => {
    const w = msg({
      proposed_action: { type: 'workout_swap', exercise: 'Čučanj', replacement: 'Glute bridge', reason: '' },
      needs_team_review: true,
    })
    expect(reviewStatus(w)?.text).toBe('Čeka potvrdu Ognjena')
    expect(reviewStatus(msg({}))).toBeNull()
  })
})

describe('ekran Pitanja', () => {
  it('prikazuje poruke, oznaku i dugme za plan tog dana', () => {
    state.messages = [
      msg({ sender: 'client', body: 'Ne volim ribu' }),
      msg({ body: 'Predlažem ćuretinu.', proposed_action: mealSwap, needs_team_review: true }),
    ]
    render(
      <MemoryRouter>
        <Questions />
      </MemoryRouter>,
    )
    expect(screen.getByText('Ne volim ribu')).toBeInTheDocument()
    expect(screen.getByText('Čeka potvrdu Olgice')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Otvori plan za dan 6' })).toHaveAttribute(
      'href',
      '/app/ishrana?dan=6',
    )
  })

  it('brzo dugme popuni pitanje, a slanje zove asistenta', async () => {
    render(
      <MemoryRouter>
        <Questions />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Zamena obroka' }))
    const input = screen.getByLabelText('Postavi pitanje')
    expect(input).toHaveValue('Želim zamenu za obrok: ')
    await userEvent.type(input, 'ručak')
    await userEvent.click(screen.getByRole('button', { name: 'Pošalji' }))
    expect(state.mutate).toHaveBeenCalledWith('Želim zamenu za obrok: ručak', expect.anything())
  })

  it('bez vežbi nema dugmeta „Vežba ne prija“; posle kraja programa nema unosa', () => {
    setup(false, 'ended')
    render(
      <MemoryRouter>
        <Questions />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: 'Vežba ne prija' })).toBeNull()
    expect(screen.queryByLabelText('Postavi pitanje')).toBeNull()
    expect(screen.getByText(/Program je završen/)).toBeInTheDocument()
  })
})
