import { Segmented } from '@/components/ui'
import { Question } from './Question'
import { TextArea } from './TextArea'

/** Pitanje Da / Ne, uz tekstualno polje koje se otvara kad je odgovor Da. */
export function YesNoWithText({
  name,
  label,
  value,
  onChange,
  textLabel,
  textValue,
  onTextChange,
  error,
  textError,
}: {
  name: string
  label: string
  value: boolean | undefined
  onChange: (value: boolean) => void
  textLabel: string
  textValue: string
  onTextChange: (value: string) => void
  error?: string
  textError?: string
}) {
  return (
    <div className="flex flex-col gap-4">
      <Question name={name} label={label} error={error}>
        <Segmented
          label={label}
          value={value === undefined ? undefined : value ? 'yes' : 'no'}
          onChange={(v) => onChange(v === 'yes')}
          options={[
            { value: 'yes', label: 'Da' },
            { value: 'no', label: 'Ne' },
          ]}
        />
      </Question>
      {value === true && (
        <TextArea
          data-field={`${name}_text`}
          label={textLabel}
          rows={2}
          value={textValue}
          onChange={(e) => onTextChange(e.target.value)}
          error={textError}
        />
      )}
    </div>
  )
}
