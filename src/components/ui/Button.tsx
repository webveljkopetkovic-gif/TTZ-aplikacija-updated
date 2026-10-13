import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'lime' | 'black' | 'soft' | 'outline'

const variants: Record<Variant, string> = {
  lime: 'bg-brand text-ink',
  black: 'bg-ink text-white',
  soft: 'bg-card text-ink border border-line',
  outline: 'bg-bg text-ink border border-ink',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  block?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'lime', block, className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex min-h-btn items-center justify-center rounded-full px-6 py-3 text-base font-bold transition-opacity disabled:opacity-50',
        variants[variant],
        block && 'w-full',
        className,
      )}
      {...props}
    />
  )
})
