import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, required, type = 'text', className, id, ...props },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const msgId = `${inputId}-msg`
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-muted">
        {label}
        {required && ' *'}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={isPassword && shown ? 'text' : type}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          className={cn(
            'min-h-[52px] w-full rounded-full border bg-card px-5 text-base text-ink placeholder:text-muted',
            error ? 'border-danger' : 'border-line',
            isPassword && 'pr-14',
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? 'Sakrij lozinku' : 'Prikaži lozinku'}
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {shown && <path d="M3 3l18 18" />}
            </svg>
          </button>
        )}
      </div>
      {(error || hint) && (
        <p
          id={msgId}
          role={error ? 'alert' : undefined}
          className={cn('mt-2 text-sm', error ? 'font-semibold text-danger' : 'text-muted')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
})
