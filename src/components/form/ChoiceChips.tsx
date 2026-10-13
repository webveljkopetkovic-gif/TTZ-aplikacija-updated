import { ChoiceChip } from '@/components/ui'
import type { Option } from '@/lib/intakeSchema'

/** Izbor više odgovora preko čipova (aria-pressed). `onToggle` odlučuje šta se menja (npr. „Ništa od navedenog“). */
export function ChoiceChips({
  options,
  value,
  onToggle,
}: {
  options: readonly Option[]
  value: readonly string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <ChoiceChip
          key={o.value}
          selected={value.includes(o.value)}
          onClick={() => onToggle(o.value)}
        >
          {o.label}
        </ChoiceChip>
      ))}
    </div>
  )
}
