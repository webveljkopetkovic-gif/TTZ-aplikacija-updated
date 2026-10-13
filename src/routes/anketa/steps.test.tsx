import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { INTAKE_DRAFT_KEY, loadDraft, mergeDraft, saveDraft } from '@/lib/intakeDraft'
import type { IntakeDraftValues } from '@/lib/intakeSchema'
import Anketa from './Anketa'

function renderStep(step: number, draft: IntakeDraftValues = {}) {
  saveDraft(mergeDraft(loadDraft(), draft))
  return render(
    <MemoryRouter initialEntries={[`/anketa/${step}`]}>
      <Routes>
        <Route path="/anketa/:step" element={<Anketa />} />
        <Route path="/" element={<p>POCETNA</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const next = () => userEvent.click(screen.getByRole('button', { name: 'Nastavi' }))

beforeEach(() => localStorage.clear())

describe('Anketa · korak 1', () => {
  it('prazna forma pokazuje greške i fokusira prvo pogrešno polje', async () => {
    renderStep(1)
    await next()
    expect(await screen.findByText('Unesite ime i prezime')).toBeInTheDocument()
    expect(screen.getByLabelText(/Ime i prezime/)).toHaveFocus()
    expect(screen.getByLabelText(/Ime i prezime/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Unesite datum rođenja')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Napredak ankete' })).toHaveAttribute(
      'aria-valuenow',
      '1',
    )
  })

  it('mlađi od 18 godina dobija poruku i ne ide dalje', async () => {
    const year = new Date().getFullYear() - 17
    renderStep(1, {
      full_name: 'Ana Marković',
      email: 'ana@primer.rs',
      phone: '064 123 4567',
      birth_date: `${year}-01-01`,
      occupation: 'Pravnica',
      sex: 'female',
      height_cm: '168',
      weight_kg: '70,5',
      country: 'Srbija',
    })
    await next()
    const alerts = await screen.findAllByRole('alert')
    expect(alerts.map((a) => a.textContent)).toContain('Program je za osobe starije od 18 godina')
    expect(screen.getByLabelText(/Datum rođenja/)).toHaveFocus()
    expect(screen.queryByText(/korak 2 od 5/)).not.toBeInTheDocument()
  })

  it('ispravan korak čuva nacrt i vodi na korak 2', async () => {
    renderStep(1, {
      full_name: 'Ana Marković',
      email: 'ana@primer.rs',
      phone: '064 123 4567',
      birth_date: '1992-03-14',
      occupation: 'Pravnica',
      sex: 'female',
      height_cm: '168',
      weight_kg: '70,5',
      country: 'Srbija',
    })
    await next()
    expect(await screen.findByText(/korak 2 od 5/)).toBeInTheDocument()
    const saved = JSON.parse(localStorage.getItem(INTAKE_DRAFT_KEY)!).values
    expect(saved).toMatchObject({
      full_name: 'Ana Marković',
      phone: '+381641234567',
      weight_kg: 70.5,
    })
  })

  it('unos u polje se odmah upisuje u nacrt', async () => {
    renderStep(1)
    fireEvent.change(screen.getByLabelText(/Zanimanje/), { target: { value: 'Lekarka' } })
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(INTAKE_DRAFT_KEY)!).values.occupation).toBe('Lekarka'),
    )
  })

  it('dugme Nazad na prvom koraku vodi na početnu', () => {
    renderStep(1)
    expect(screen.getByRole('link', { name: 'Nazad' })).toHaveAttribute('href', '/')
  })
})

describe('Anketa · korak 2', () => {
  it('pitanje o trudnoćama vide samo žene', () => {
    const { unmount } = renderStep(2, { sex: 'male' })
    expect(screen.queryByText('Broj trudnoća do sad')).not.toBeInTheDocument()
    unmount()

    renderStep(2, { sex: 'female' })
    expect(screen.getByText('Broj trudnoća do sad')).toBeInTheDocument()
  })

  it('Da otvara polje za tekst koje je tada obavezno', async () => {
    renderStep(2, {
      sex: 'male',
      diagnoses: 'Hipotireoza',
      allergies: true,
      surgery: false,
      childhood_tonsillitis: 'no',
    })
    expect(screen.getByLabelText('Koje?')).toBeInTheDocument()
    await next()
    expect(await screen.findByText('Navedite koje alergije')).toBeInTheDocument()
    expect(screen.getByLabelText('Koje?')).toHaveFocus()
  })

  it('„Nemam dijagnoza“ zamenjuje polje dijagnoza', async () => {
    renderStep(2, { sex: 'male', allergies: false, surgery: false, childhood_tonsillitis: 'no' })
    await next()
    expect(await screen.findByText(/Navedite dijagnoze ili označite/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Nemam dijagnoza' }))
    await next()
    expect(await screen.findByText(/korak 3 od 5/)).toBeInTheDocument()
  })
})

describe('Anketa · korak 4', () => {
  it('„Ništa od navedenog“ isključuje ostale izbore', async () => {
    renderStep(4, { work_exposure: ['stress', 'deadlines'] })
    expect(screen.getByRole('button', { name: 'Preteran stres' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Ništa od navedenog' }))
    expect(screen.getByRole('button', { name: 'Ništa od navedenog' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Preteran stres' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Rokovi' })).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(screen.getByRole('button', { name: 'Rokovi' }))
    expect(screen.getByRole('button', { name: 'Ništa od navedenog' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Rokovi' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Anketa · rute', () => {
  it('nepoznat korak vodi na prvi', () => {
    renderStep(9)
    expect(screen.getByText(/korak 1 od 5/)).toBeInTheDocument()
  })
})
