import { useId } from 'react'
import { cn } from '@/lib/cn'
import {
  EXERCISE_TAG_LABEL,
  FOOD_TAG_LABEL,
  type ExerciseTag,
  type FoodTag,
  type StoredAnswers,
} from '@/lib/feedbackSchema'

/** Ocena 1–5 sa pet krugova (design/Feedback forma): radio grupa, radi tastaturom i čitačem ekrana. */
export function Scale({
  label,
  value,
  onChange,
  tone,
  error,
}: {
  label: string
  value: number | undefined
  onChange: (v: number) => void
  tone: 'green' | 'black'
  error?: string
}) {
  const id = useId()
  return (
    <div>
      <p id={id} className="text-lg font-bold">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={id}
        aria-invalid={error ? true : undefined}
        className={cn(
          'mt-2 flex items-center justify-between rounded-card bg-card px-3 py-2',
          error && 'ring-2 ring-danger',
        )}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = value !== undefined && n <= value
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} od 5`}
              onClick={() => onChange(n)}
              className="flex h-11 w-11 items-center justify-center"
            >
              <span
                className={cn(
                  'h-8 w-8 rounded-full',
                  filled ? (tone === 'green' ? 'bg-chart' : 'bg-ink') : 'bg-line',
                )}
              />
            </button>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export const foodLabel = (t: string) => FOOD_TAG_LABEL[t as FoodTag] ?? t
export const exerciseLabel = (t: string) => EXERCISE_TAG_LABEL[t as ExerciseTag] ?? t

/** Odgovori klijenta kao čitljiv spisak (klijent vidi svoje poslato, tim vidi u tabeli). */
export function AnswerList({ answers }: { answers: Partial<StoredAnswers> }) {
  const rows: [string, string][] = []
  if (answers.general) rows.push(['Kako se osećaš', `${answers.general}/5`])
  if (answers.energy_am) rows.push(['Energija ujutru', `${answers.energy_am}/5`])
  if (answers.food_tags?.length || answers.food_text) {
    rows.push([
      'Ishrana smeta',
      [answers.food_tags?.map(foodLabel).join(', '), answers.food_text].filter(Boolean).join(' — '),
    ])
  }
  if (answers.exercise_tags?.length || answers.exercise_text) {
    rows.push([
      'Vežbe',
      [answers.exercise_tags?.map(exerciseLabel).join(', '), answers.exercise_text]
        .filter(Boolean)
        .join(' — '),
    ])
  }
  if (answers.challenges) rows.push(['Izazovi', answers.challenges])
  if (answers.weight_kg) rows.push(['Težina', `${String(answers.weight_kg).replace('.', ',')} kg`])
  if (answers.waist_cm)
    rows.push(['Obim struka', `${String(answers.waist_cm).replace('.', ',')} cm`])
  return (
    <dl className="divide-y divide-line">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
          <dt className="text-muted sm:w-40 sm:shrink-0">{k}</dt>
          <dd className="font-bold">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
