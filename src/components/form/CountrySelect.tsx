import { forwardRef, useId, useMemo, type InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui'

let cached: string[] | null = null

/** Nazivi svih država na srpskom (latinica), iz Intl.DisplayNames. */
export function countryNames(): string[] {
  if (cached) return cached
  const names = new Intl.DisplayNames(['sr-Latn'], { type: 'region', fallback: 'none' })
  const result = new Set<string>()
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b)
      const name = names.of(code)
      if (name && name !== code) result.add(name)
    }
  }
  cached = [...result].sort((x, y) => x.localeCompare(y, 'sr-Latn'))
  return cached
}

/** Polje za državu sa pretragom (datalist). Dozvoljava i upis države koje nema na listi. */
export const CountrySelect = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'list' | 'type'> & {
    label: string
    error?: string
    hint?: string
  }
>(function CountrySelect(props, ref) {
  const listId = useId()
  const names = useMemo(countryNames, [])
  return (
    <>
      <Input ref={ref} list={listId} autoComplete="country-name" {...props} />
      <datalist id={listId}>
        {names.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </>
  )
})
