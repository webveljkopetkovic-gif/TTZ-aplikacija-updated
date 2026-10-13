import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  ChoiceChips,
  CountrySelect,
  FileUploadList,
  formatFileSize,
  OptionList,
  Question,
  TextArea,
  YesNoWithText,
  type UploadItem,
} from '.'
import { ACTIVITY_OPTIONS, SYMPTOM_OPTIONS } from '@/lib/intakeSchema'

describe('ChoiceChips', () => {
  it('prikazuje izbor preko aria-pressed i javlja klik', async () => {
    const onToggle = vi.fn()
    render(<ChoiceChips options={SYMPTOM_OPTIONS} value={['fatigue']} onToggle={onToggle} />)
    expect(screen.getByRole('button', { name: 'Umor' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Nadutost' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Nadutost' }))
    expect(onToggle).toHaveBeenCalledWith('bloating')
  })

  it('radi tastaturom (Tab + Enter/Space)', async () => {
    const onToggle = vi.fn()
    render(<ChoiceChips options={SYMPTOM_OPTIONS} value={[]} onToggle={onToggle} />)
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Umor' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(onToggle).toHaveBeenCalledTimes(2)
  })
})

describe('OptionList', () => {
  function Harness() {
    const [value, setValue] = useState<string>()
    return (
      <OptionList name="activity" options={ACTIVITY_OPTIONS} value={value} onChange={setValue} />
    )
  }

  it('je radio grupa sa opisima, strelice menjaju izbor', async () => {
    render(<Harness />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(4)
    expect(screen.getByText('Vežbam 2–3 puta nedeljno')).toBeInTheDocument()

    await userEvent.tab()
    expect(radios[0]).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(radios[1]).toBeChecked()
    await userEvent.click(screen.getByText('Visok'))
    expect(radios[3]).toBeChecked()
  })
})

describe('Question i TextArea', () => {
  it('Question vezuje opis i grešku za grupu', () => {
    render(
      <Question label="Pitanje" hint="Pomoć" error="Odaberite odgovor">
        <button>Odgovor</button>
      </Question>,
    )
    const group = screen.getByRole('group', { name: 'Pitanje' })
    expect(group).toHaveAccessibleDescription('Pomoć Odaberite odgovor')
    expect(screen.getByRole('alert')).toHaveTextContent('Odaberite odgovor')
  })

  it('TextArea ima labelu i grešku vezanu za polje', () => {
    render(<TextArea label="Napomena" error="Najviše 2000 znakova" />)
    const field = screen.getByLabelText('Napomena')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription('Najviše 2000 znakova')
  })
})

describe('YesNoWithText', () => {
  function Harness({ initial }: { initial?: boolean }) {
    const [value, setValue] = useState<boolean | undefined>(initial)
    const [text, setText] = useState('')
    return (
      <YesNoWithText
        name="allergies"
        label="Da li imate alergije?"
        value={value}
        onChange={setValue}
        textLabel="Koje?"
        textValue={text}
        onTextChange={setText}
      />
    )
  }

  it('polje za tekst se otvara samo kad je odgovor Da', async () => {
    render(<Harness />)
    expect(screen.queryByLabelText('Koje?')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Da' }))
    expect(screen.getByLabelText('Koje?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Ne' }))
    expect(screen.queryByLabelText('Koje?')).not.toBeInTheDocument()
  })
})

describe('FileUploadList', () => {
  const items: UploadItem[] = [
    {
      id: 'a',
      name: 'Krvna slika.pdf',
      size: 1.2 * 1024 * 1024,
      type: 'application/pdf',
      status: 'done',
    },
    { id: 'b', name: 'OGTT.jpg', size: 2.4 * 1024 * 1024, type: 'image/jpeg', status: 'done' },
    {
      id: 'c',
      name: 'veliki.pdf',
      size: 20_000_000,
      type: 'application/pdf',
      status: 'error',
      error: 'Fajl je veći od 10 MB',
    },
  ]

  it('prikazuje naziv, tip i veličinu kao na dizajnu', () => {
    render(<FileUploadList items={items} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText('PDF · 1,2 MB')).toBeInTheDocument()
    expect(screen.getByText('Slika · 2,4 MB')).toBeInTheDocument()
    expect(screen.getByText('Fajl je veći od 10 MB')).toBeInTheDocument()
  })

  it('ukloni dugme ima labelu sa imenom fajla', async () => {
    const onRemove = vi.fn()
    render(<FileUploadList items={items} onAdd={vi.fn()} onRemove={onRemove} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ukloni OGTT.jpg' }))
    expect(onRemove).toHaveBeenCalledWith('b')
  })

  it('prosleđuje izabrane fajlove, a dugme „Dodaj nalaz“ otvara izbor', async () => {
    const onAdd = vi.fn()
    render(<FileUploadList items={[]} onAdd={onAdd} onRemove={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Dodaj nalaz/ })).toBeEnabled()
    const file = new File(['x'], 'nalaz.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByTestId('lab-file-input'), file)
    expect(onAdd).toHaveBeenCalledWith([file])
  })

  it('formatFileSize', () => {
    expect(formatFileSize(500)).toBe('1 KB')
    expect(formatFileSize(10 * 1024)).toBe('10 KB')
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe('2,4 MB')
  })
})

describe('CountrySelect', () => {
  it('nudi države na srpskom, uključujući Srbiju', () => {
    const { container } = render(
      <CountrySelect label="Država u kojoj živite" defaultValue="Srbija" />,
    )
    expect(screen.getByLabelText('Država u kojoj živite')).toHaveValue('Srbija')
    const options = Array.from(container.querySelectorAll('datalist option')).map((o) =>
      o.getAttribute('value'),
    )
    expect(options).toContain('Srbija')
    expect(options).toContain('Hrvatska')
    expect(options.length).toBeGreaterThan(150)
  })
})

describe('Question grupe u okviru liste', () => {
  it('Segmented unutar YesNo je radiogroup sa Da i Ne', () => {
    render(
      <YesNoWithText
        name="surgery"
        label="Da li ste imali operaciju?"
        value={undefined}
        onChange={vi.fn()}
        textLabel="Koju i kada"
        textValue=""
        onTextChange={vi.fn()}
      />,
    )
    const group = screen.getByRole('radiogroup', { name: 'Da li ste imali operaciju?' })
    expect(
      within(group)
        .getAllByRole('radio')
        .map((r) => r.textContent),
    ).toEqual(['Da', 'Ne'])
  })
})
