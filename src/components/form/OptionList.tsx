import { useId } from 'react'
import { cn } from '@/lib/cn'
import type { Option } from '@/lib/intakeSchema'

/** Lista odgovora sa opisom (radio kartice). Nativni radio input daje tastaturu i čitač ekrana. */
export function OptionList({
  options,
  value,
  onChange,
  name,
}: {
  options: readonly Option[]
  value: string | undefined
  onChange: (value: string) => void
  name?: string
}) {
  const groupName = useId()
  return (
    <div className="flex flex-col gap-3">
      {options.map((o) => {
        const selected = value === o.value
        return (
          <label
            key={o.value}
            className={cn(
              'flex min-h-[64px] cursor-pointer items-center gap-4 rounded-[22px] border-2 bg-card px-5 py-3',
              'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
              selected ? 'border-chart' : 'border-line',
            )}
          >
            <input
              type="radio"
              name={name ?? groupName}
              value={o.value}
              checked={selected}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                selected ? 'border-ink bg-ink' : 'border-muted',
              )}
            >
              {selected && <span className="h-3 w-3 rounded-full bg-brand" />}
            </span>
            <span>
              <span className="block text-base font-bold leading-snug">{o.label}</span>
              {o.description && <span className="block text-sm text-muted">{o.description}</span>}
            </span>
          </label>
        )
      })}
    </div>
  )
}
