import type { ButtonHTMLAttributes, HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'lime' | 'black' | 'gray' | 'outline'

const tones: Record<Tone, string> = {
  lime: 'bg-brand text-ink',
  black: 'bg-ink text-white',
  gray: 'bg-line text-ink',
  outline: 'border border-brand-text bg-bg text-brand-text',
}

const base = 'inline-flex items-center rounded-full px-3 py-1.5 text-sm font-bold'

export function Chip({
  tone = 'gray',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn(base, tones[tone], className)} {...props} />
}

/** Chip za izbor (više izbora). Dostupan tastaturi i čitaču ekrana preko aria-pressed. */
export function ChoiceChip({
  selected,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        base,
        'min-h-btn border px-4',
        selected ? 'border-ink bg-ink text-white' : 'border-line bg-card text-ink',
        className,
      )}
      {...props}
    />
  )
}
