import { Segmented } from '@/components/ui'
import type { Option } from '@/lib/intakeSchema'
import { OptionList } from './OptionList'
import { Question } from './Question'

/** Pitanje sa jednim odgovorom: kratke opcije kao segmenti, duže (`list`) kao radio kartice. */
export function ChoiceQuestion({
  name,
  label,
  hint,
  options,
  value,
  onChange,
  error,
  list,
}: {
  name: string
  label: string
  hint?: string
  options: readonly Option[]
  value: string | undefined
  onChange: (value: string) => void
  error?: string
  list?: boolean
}) {
  return (
    <Question name={name} label={label} hint={hint} error={error}>
      {list ? (
        <OptionList name={name} options={options} value={value} onChange={onChange} />
      ) : (
        <Segmented
          label={label}
          value={value}
          onChange={onChange}
          options={options.map((o) => ({ value: o.value, label: o.label }))}
        />
      )}
    </Question>
  )
}
