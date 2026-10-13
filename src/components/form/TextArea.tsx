import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { FieldError } from './FieldError'

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
}

/** Višelinijsko polje sa naslovom pitanja (podebljan, kao na dizajnu ankete). */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, rows = 3, className, id, ...props },
  ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const describedBy = [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="block text-lg font-bold leading-snug">
        {label}
      </label>
      {hint && (
        <p id={`${fieldId}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          'mt-3 w-full resize-none rounded-[22px] border bg-card px-5 py-4 text-base text-ink placeholder:text-muted',
          error ? 'border-danger' : 'border-line',
        )}
        {...props}
      />
      <FieldError id={`${fieldId}-error`} message={error} />
    </div>
  )
})
