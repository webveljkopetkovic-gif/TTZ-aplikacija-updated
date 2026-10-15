import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlanMeal } from '@/lib/planMeals'

const state = vi.hoisted(() => ({
  my: {} as Record<string, unknown>,
  meals: [] as PlanMeal[],
  done: new Set<string>(),
  toggle: vi.fn(),
  feedbacks: [] as { id: string; due_day: number; status: string }[],
}))

vi.mock('@/hooks/useMyProgram', () => ({ useMyProgram: () => state.my }))
vi.mock('@/api/client', () => {
  const ok = (data: unknown) => ({ data, isPending: false, isError: false, isSuccess: true })
  return {
    useProgramMeals: () => ok(state.meals),
    useMealLogs: () => ok(state.done),
    useToggleMeal: () => ({ mutate: state.toggle, isPending: false, isError: false }),
    useMySupplements: () =>
      ok([{ id: 's1', name: 'Vitamin D3', timing: 'uz doručak', note: null }]),
    useSupplementLogs: () => ok(new Set<string>()),
    useToggleSupplement: () => ({ mutate: vi.fn() }),
    useWorkoutsForLevel: () => ok([]),
  }
})

vi.mock('@/api/feedback', () => ({
  useMyFeedbacks: () => ({
    data: state.feedbacks,
    isPending: false,
    isError: false,
    isSuccess: true,
  }),
}))

import Home from './Home'
import Journey from './Journey'
import Meals from './Meals'

const meal = (
  plan_day: number,
  slot: PlanMeal['slot'],
  title: string,
  time: string,
  cycle = 1,
): PlanMeal => ({
  plan_day,
  slot,
  title,
  time_of_day: time,
  valid_from_cycle: cycle,
})

function myProgram(day: number, planDay: number, cycle: number, withTraining = false) {
  return {
    userId: 'u1',
    profile: { full_name: 'Ana Marković' },
    program: {
      id: 'p1',
      status: 'active',
      plan_focus: 'Insulinska rezistencija',
      exercise_level: 'beginner',
      activated_at: '2026-10-05',
    },
    today: '2026-10-05',
    day,
    planDay,
    cycle,
    duration: 30,
    withTraining,
    trainingWeekdays: [1, 3, 5],
  }
}

const renderAt = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

beforeEach(() => {
  state.done = new Set()
  state.feedbacks = []
  state.toggle.mockClear()
  state.meals = [
    meal(1, 'breakfast', 'Jaja i avokado', '08:00:00'),
    meal(1, 'lunch', 'Ćuretina, heljda, salata', '14:00:00'),
    meal(6, 'lunch', 'Pileće belo', '14:00:00'),
    meal(6, 'lunch', 'Ćuretina umesto piletine', '14:00:00', 2),
  ]
})

describe('Početna', () => {
  it('prikazuje dan 1 od 14 u 1. krugu i današnje obroke, prvi nije štikliran', () => {
    state.my = myProgram(1, 1, 1)
    renderAt(<Home />)
    expect(screen.getByText('Zdravo, Ana!')).toBeInTheDocument()
    expect(screen.getByText(/Dan 1 od 30 · insulinska rezistencija/)).toBeInTheDocument()
    expect(screen.getByText(/od 14 · 1\. krug/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Doručak: Jaja i avokado/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByText(/ručak · ćuretina, heljda, salata/i)).toBeInTheDocument()
  })

  it('štikliranje obroka šalje slot i novo stanje', async () => {
    state.my = myProgram(1, 1, 1)
    renderAt(<Home />)
    await userEvent.click(screen.getByRole('button', { name: /Doručak: Jaja i avokado/ }))
    expect(state.toggle).toHaveBeenCalledWith({ slot: 'breakfast', done: true })
  })

  it('dan 20 je plan dan 6 u 2. krugu i prikazuje izmenjen obrok', () => {
    state.my = myProgram(20, 6, 2)
    renderAt(<Home />)
    expect(screen.getByText(/Dan 6/)).toBeInTheDocument()
    expect(screen.getByText(/2\. krug/)).toBeInTheDocument()
    expect(screen.getByText(/ćuretina umesto piletine/i)).toBeInTheDocument()
    expect(screen.queryByText(/pileće belo/i)).not.toBeInTheDocument()
  })

  it('suplementi i tok programa sa brojem dana do feedbacka', () => {
    state.my = myProgram(1, 1, 1)
    renderAt(<Home />)
    expect(screen.getByRole('button', { name: /Vitamin D3 · doručak/ })).toBeInTheDocument()
    expect(screen.getByText('Sledeći feedback za 9 dana')).toBeInTheDocument()
  })

  it('otvoren feedback se vidi kao baner sa vezom na formu', () => {
    state.my = myProgram(10, 10, 1)
    state.feedbacks = [{ id: 'f1', due_day: 10, status: 'open' }]
    renderAt(<Home />)
    expect(screen.getByRole('link', { name: /Feedback za dan 10 je otvoren/ })).toHaveAttribute(
      'href',
      '/app/feedback/10',
    )
  })

  it('bez otvorenog feedbacka nema banera', () => {
    state.my = myProgram(3, 3, 1)
    state.feedbacks = [{ id: 'f1', due_day: 10, status: 'scheduled' }]
    renderAt(<Home />)
    expect(screen.queryByText(/je otvoren/)).not.toBeInTheDocument()
  })

  it('bez vežbi nema kartice za trening', () => {
    state.my = myProgram(1, 1, 1, false)
    renderAt(<Home />)
    expect(screen.queryByText(/Trening danas|Danas je odmor/)).not.toBeInTheDocument()
  })

  it('sa vežbama u dan treninga (ponedeljak) prikazuje karticu za trening', () => {
    state.my = myProgram(1, 1, 1, true) // 2026-10-05 je ponedeljak
    renderAt(<Home />)
    expect(screen.getByText(/Trening danas/)).toBeInTheDocument()
  })
})

describe('Plan ishrane', () => {
  it('današnji dan je izabran, selektor ima 14 dana, a bez kalorija je istaknuto', () => {
    state.my = myProgram(1, 1, 1)
    renderAt(<Meals />)
    expect(screen.getByRole('button', { name: 'Dan 1 (danas)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      within(screen.getByRole('group', { name: 'Dan plana' })).getAllByRole('button'),
    ).toHaveLength(14)
    expect(screen.getByText(/Bez brojanja kalorija i vaganja namirnica/)).toBeInTheDocument()
  })

  it('prvi nepojeden obrok ima Recept i Zameni obrok, a recept se otvara', async () => {
    state.meals = [
      { ...meal(1, 'breakfast', 'Jaja i avokado', '08:00:00'), recipe: 'Skuvaj jaja.' },
    ]
    state.my = myProgram(1, 1, 1)
    renderAt(<Meals />)
    expect(screen.getByText(/sledeći/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Recept' }))
    expect(screen.getByText('Skuvaj jaja.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Zameni obrok' })).toHaveAttribute(
      'href',
      '/app/pitanja?zamena=breakfast&dan=1',
    )
  })

  it('izbor drugog dana menja obroke', async () => {
    state.my = myProgram(1, 1, 1)
    renderAt(<Meals />)
    await userEvent.click(screen.getByRole('button', { name: 'Dan 6' }))
    expect(screen.getByText('Pileće belo')).toBeInTheDocument()
    expect(screen.queryByText('Jaja i avokado')).not.toBeInTheDocument()
  })
})

describe('Tok programa', () => {
  it('kalendar ima 30 dana, danas, feedback dane i novi krug na 15 i 29', () => {
    state.my = myProgram(1, 1, 1, true)
    renderAt(<Journey />)
    const calendar = screen.getByRole('list', { name: 'Kalendar programa' })
    expect(within(calendar).getAllByRole('listitem')).toHaveLength(30)
    expect(within(calendar).getByLabelText(/^Dan 1, danas/)).toHaveAttribute('aria-current', 'date')
    expect(within(calendar).getByLabelText(/^Dan 10, feedback/)).toBeInTheDocument()
    expect(within(calendar).getByLabelText(/^Dan 20, feedback/)).toBeInTheDocument()
    expect(within(calendar).getByLabelText(/^Dan 30, feedback/)).toBeInTheDocument()
    expect(within(calendar).getByLabelText(/^Dan 15, novi krug plana/)).toBeInTheDocument()
    expect(within(calendar).getByLabelText(/^Dan 29, novi krug plana/)).toBeInTheDocument()
    expect(screen.getByText('Feedback za 9 dana')).toBeInTheDocument()
  })

  it('vremenska linija: dan 1 je „DANAS“, a stavka o vežbama zavisi od plana', () => {
    state.my = myProgram(1, 1, 1, false)
    renderAt(<Journey />)
    expect(screen.getByText('DAN 1 · DANAS')).toBeInTheDocument()
    expect(screen.queryByText('VEŽBE')).not.toBeInTheDocument()
  })
})
