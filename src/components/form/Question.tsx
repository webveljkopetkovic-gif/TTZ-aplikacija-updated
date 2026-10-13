import { useId, type ReactNode } from 'react'
import { FieldError } from './FieldError'

/**
 * Okvir za pitanje sa izborom (čipovi, segmenti, opcije): naslov, opis i greška su vezani
 * za grupu preko aria-labelledby i aria-describedby. `name` služi za fokus na prvo pogrešno polje.
 */
export function Question({
  name,
  label,
  hint,
  error,
  children,
}: {
  name?: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      role="group"
      data-field={name}
      aria-labelledby={`${id}-label`}
      aria-describedby={describedBy || undefined}
    >
      <p id={`${id}-label`} className="text-lg font-bold leading-snug">
        {label}
      </p>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      <div className="mt-3">{children}</div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}
