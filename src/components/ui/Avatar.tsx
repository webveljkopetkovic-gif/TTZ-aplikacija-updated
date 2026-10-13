import { cn } from '@/lib/cn'

type Tone = 'olgica' | 'ognjen' | 'client'

const tones: Record<Tone, string> = {
  olgica: 'bg-brand text-ink',
  ognjen: 'bg-ink text-white',
  client: 'bg-card text-ink border-2 border-chart',
}

const sizes = { sm: 'h-9 w-9 text-sm', md: 'h-12 w-12 text-lg', lg: 'h-16 w-16 text-2xl' }

export function Avatar({
  name,
  tone = 'client',
  size = 'md',
  src,
}: {
  name: string
  tone?: Tone
  size?: keyof typeof sizes
  src?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold',
        tones[tone],
        sizes[size],
      )}
      role="img"
      aria-label={name}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  )
}
