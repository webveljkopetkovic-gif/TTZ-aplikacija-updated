import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Avatar, Button, ChoiceChip, Input, Segmented, TabBar, Toggle } from '.'

describe('UI komponente', () => {
  it('Button je pill sa minimalnom visinom 44px', () => {
    render(<Button>Nastavi</Button>)
    const btn = screen.getByRole('button', { name: 'Nastavi' })
    expect(btn).toHaveClass('rounded-full', 'min-h-btn', 'bg-brand', 'text-ink')
  })

  it('Input povezuje labelu i grešku sa poljem', () => {
    render(<Input label="Email" required error="Neispravan email" />)
    const field = screen.getByLabelText('Email *')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription('Neispravan email')
  })

  it('Input za lozinku prikazuje i sakriva tekst', async () => {
    render(<Input label="Lozinka" type="password" defaultValue="tajna" />)
    const field = screen.getByLabelText('Lozinka')
    expect(field).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Prikaži lozinku' }))
    expect(field).toHaveAttribute('type', 'text')
  })

  it('ChoiceChip koristi aria-pressed', async () => {
    const onClick = vi.fn()
    render(
      <ChoiceChip selected onClick={onClick}>
        Umor
      </ChoiceChip>,
    )
    const chip = screen.getByRole('button', { name: 'Umor' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(chip)
    expect(onClick).toHaveBeenCalled()
  })

  it('Segmented menja vrednost', async () => {
    const onChange = vi.fn()
    render(
      <Segmented
        label="Pol"
        value="female"
        onChange={onChange}
        options={[
          { value: 'female', label: 'Žena' },
          { value: 'male', label: 'Muškarac' },
        ]}
      />,
    )
    await userEvent.click(screen.getByRole('radio', { name: 'Muškarac' }))
    expect(onChange).toHaveBeenCalledWith('male')
  })

  it('Toggle je switch', async () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} label="Podsetnik" />)
    await userEvent.click(screen.getByRole('switch', { name: 'Podsetnik' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('Avatar ima ime za čitač ekrana', () => {
    render(<Avatar name="Olgica" tone="olgica" />)
    expect(screen.getByRole('img', { name: 'Olgica' })).toHaveTextContent('O')
  })

  it('TabBar ima 4 tab-a i centralno dugme', () => {
    render(
      <MemoryRouter>
        <TabBar />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('link')).toHaveLength(5)
    expect(screen.getByRole('link', { name: 'Tok programa' })).toBeInTheDocument()
  })
})
