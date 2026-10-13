import { cn } from '@/lib/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

/** Segmentirani izbor (npr. Žena / Muškarac). Radio grupa za čitač ekrana. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: SegmentedOption<T>[]
  value: T | undefined
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-card p-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-btn flex-1 rounded-full px-4 text-base font-bold',
            value === o.value ? 'bg-ink text-white' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Prekidač uključeno / isključeno (podsetnici). */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-[60px] items-center"
    >
      <span
        className={cn(
          'flex h-8 w-14 items-center rounded-full p-1 transition-colors',
          checked ? 'bg-brand' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'h-6 w-6 rounded-full bg-ink transition-transform',
            checked ? 'translate-x-6' : 'translate-x-0',
          )}
        />
      </span>
    </button>
  )
}
