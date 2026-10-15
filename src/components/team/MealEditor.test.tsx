import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MealEditor, type MealItem } from './MealEditor'

const item = (plan_day: number, slot: MealItem['slot'], title: string): MealItem => ({
  plan_day,
  slot,
  time_of_day: '14:00:00',
  title,
  description: null,
  recipe: null,
})

const items: MealItem[] = [
  item(1, 'lunch', 'Ćuretina, heljda, salata'),
  item(3, 'lunch', 'Riba sa blitvom'),
]

describe('MealEditor', () => {
  it('odbija obrok sa gramima i ne poziva čuvanje', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<MealEditor items={items} onSave={onSave} />)

    const title = screen.getByDisplayValue('Ćuretina, heljda, salata')
    await userEvent.clear(title)
    await userEvent.type(title, 'Ćuretina 150 g')
    await userEvent.click(screen.getAllByRole('button', { name: 'Sačuvaj' })[2])

    expect(await screen.findByText(/Bez grama i mera u gramima/)).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('odbija kalorije u receptu', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<MealEditor items={items} onSave={onSave} />)

    await userEvent.type(screen.getByLabelText('Recept: Ručak'), 'Obrok ima 400 kalorija')
    await userEvent.click(screen.getAllByRole('button', { name: 'Sačuvaj' })[2])

    expect(await screen.findByText(/Bez kalorija/)).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('čuva ispravan obrok sa danom, obrokom i vremenom', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<MealEditor items={items} onSave={onSave} />)

    const title = screen.getByDisplayValue('Ćuretina, heljda, salata')
    await userEvent.clear(title)
    await userEvent.type(title, 'Pileće belo sa brokolijem')
    await userEvent.click(screen.getAllByRole('button', { name: 'Sačuvaj' })[2])

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledWith({
      plan_day: 1,
      slot: 'lunch',
      time_of_day: '14:00',
      title: 'Pileće belo sa brokolijem',
      description: '',
      recipe: '',
    })
  })

  it('traži naziv obroka', async () => {
    const onSave = vi.fn()
    render(<MealEditor items={[]} onSave={onSave} />)

    await userEvent.type(screen.getAllByPlaceholderText(/Ćuretina, heljda/)[0], 'x')
    await userEvent.clear(screen.getAllByPlaceholderText(/Ćuretina, heljda/)[0])
    // dugme je neaktivno dok se ništa ne menja, pa se prazno polje ne može poslati
    expect(screen.getAllByRole('button', { name: 'Sačuvaj' })[0]).toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('označava dan i obrok koji sadrže hranu koju klijent ne voli', async () => {
    render(<MealEditor items={items} words={['riba']} onSave={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Dan 3 \(upozorenje\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dan 1' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Dan 3/ }))
    expect(screen.getByText(/Klijent ne voli ili ne sme: „riba“/)).toBeInTheDocument()
  })

  it('prazan dan je označen', () => {
    render(<MealEditor items={items} onSave={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Dan 2 (prazan)' })).toBeInTheDocument()
  })
})
