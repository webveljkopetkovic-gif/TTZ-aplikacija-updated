import { useState } from 'react'
import { SLOTS } from '@/api/team'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { matchDisliked } from '@/lib/dislikes'
import { mealViolation } from '@/lib/mealRules'

export interface MealItem {
  plan_day: number
  slot: (typeof SLOTS)[number]['value']
  time_of_day: string
  title: string
  description: string | null
  recipe: string | null
}

export interface MealDraft {
  plan_day: number
  slot: MealItem['slot']
  time_of_day: string
  title: string
  description: string
  recipe: string
}

const hhmm = (t: string) => t.slice(0, 5)

/** Jedan obrok: naslov, opis i recept. Forma odbija kalorije, grame i vaganje (CLAUDE.md). */
function SlotEditor({
  day,
  slot,
  item,
  words,
  onSave,
}: {
  day: number
  slot: (typeof SLOTS)[number]
  item: MealItem | undefined
  words: readonly string[]
  onSave: (meal: MealDraft) => Promise<void>
}) {
  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [recipe, setRecipe] = useState(item?.recipe ?? '')
  const [time, setTime] = useState(hhmm(item?.time_of_day ?? slot.time))
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const flagged = matchDisliked({ title, description, recipe }, words)
  const dirty =
    title !== (item?.title ?? '') ||
    description !== (item?.description ?? '') ||
    recipe !== (item?.recipe ?? '') ||
    time !== hhmm(item?.time_of_day ?? slot.time)
  const fieldId = `meal-${day}-${slot.value}`

  const save = async () => {
    setSaved(false)
    if (title.trim() === '') return setError('Upiši naziv obroka')
    const violation = mealViolation({ title, description, recipe })
    if (violation) return setError(`${violation.message}. Opiši obrok bez brojeva i mera.`)
    setError(undefined)
    setSaving(true)
    try {
      await onSave({
        plan_day: day,
        slot: slot.value,
        time_of_day: time,
        title: title.trim(),
        description: description.trim(),
        recipe: recipe.trim(),
      })
      setSaved(true)
    } catch {
      setError('Obrok nije sačuvan. Pokušaj ponovo.')
    } finally {
      setSaving(false)
    }
  }

  const field = 'w-full rounded-2xl border border-line bg-bg px-4 py-3 text-base'

  return (
    <li className={cn('rounded-card bg-bg p-4', flagged && 'border-2 border-danger')}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`${fieldId}-title`} className="font-extrabold">
          {slot.label}
        </label>
        <input
          type="time"
          aria-label={`Vreme: ${slot.label}`}
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-full border border-line bg-card px-3 py-1.5"
        />
      </div>
      <input
        id={`${fieldId}-title`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Npr. Ćuretina, heljda, salata"
        aria-invalid={error ? true : undefined}
        className={cn(field, 'mt-3 min-h-[48px]')}
      />
      <details className="mt-2" open={!!(description || recipe)}>
        <summary className="min-h-btn cursor-pointer py-2 text-sm font-bold text-brand-text">
          Opis i recept
        </summary>
        <textarea
          aria-label={`Opis: ${slot.label}`}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Kratak opis (bez grama)"
          className={cn(field, 'mt-1 resize-none')}
        />
        <textarea
          aria-label={`Recept: ${slot.label}`}
          rows={3}
          value={recipe}
          onChange={(e) => setRecipe(e.target.value)}
          placeholder="Recept (bez grama, kalorija i vaganja)"
          className={cn(field, 'mt-2 resize-none')}
        />
      </details>
      {flagged && (
        <p role="note" className="mt-2 font-semibold text-danger">
          Klijent ne voli ili ne sme: „{flagged}“. Zameni obrok.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 font-semibold text-danger">
          {error}
        </p>
      )}
      <div className="mt-3 flex items-center gap-3">
        <Button
          variant="black"
          disabled={saving || !dirty}
          onClick={save}
          className="min-h-[44px] px-5 py-2"
        >
          {saving ? 'Čuvam…' : 'Sačuvaj'}
        </Button>
        {saved && !dirty && <span className="text-sm font-bold text-brand-text">Sačuvano</span>}
      </div>
    </li>
  )
}

/** Plan ishrane po danima (1–14): selektor dana i pet obroka. Isti editor služi za šablone i klijente. */
export function MealEditor({
  items,
  words = [],
  onSave,
}: {
  items: readonly MealItem[]
  words?: readonly string[]
  onSave: (meal: MealDraft) => Promise<void>
}) {
  const [day, setDay] = useState(1)
  const flaggedDays = new Set(items.filter((i) => matchDisliked(i, words)).map((i) => i.plan_day))
  const filled = new Set(items.map((i) => i.plan_day))

  return (
    <div>
      <div role="group" aria-label="Dan plana" className="flex flex-wrap gap-2">
        {Array.from({ length: 14 }, (_, i) => i + 1).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={day === d}
            aria-label={`Dan ${d}${flaggedDays.has(d) ? ' (upozorenje)' : ''}${filled.has(d) ? '' : ' (prazan)'}`}
            onClick={() => setDay(d)}
            className={cn(
              'relative flex h-11 w-11 items-center justify-center rounded-full text-base font-bold',
              day === d
                ? 'bg-ink text-white'
                : filled.has(d)
                  ? 'bg-bg'
                  : 'border border-dashed border-muted bg-bg text-muted',
            )}
          >
            {d}
            {flaggedDays.has(d) && (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-danger"
              />
            )}
          </button>
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {SLOTS.map((slot) => {
          const item = items.find((i) => i.plan_day === day && i.slot === slot.value)
          return (
            <SlotEditor
              key={`${day}-${slot.value}-${item?.title ?? ''}-${item?.time_of_day ?? ''}`}
              day={day}
              slot={slot}
              item={item}
              words={words}
              onSave={onSave}
            />
          )
        })}
      </ul>
    </div>
  )
}
