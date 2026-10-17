import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProgramMeals } from '@/api/client'
import { ErrorNote, Loading, Panel, Screen, ScreenHeader } from '@/components/client/ui'
import { useMyProgram } from '@/hooks/useMyProgram'
import { cn } from '@/lib/cn'
import { shoppingByDay, shoppingList } from '@/lib/planMeals'

const RANGES = [
  { days: 1, label: 'Danas' },
  { days: 3, label: '3 dana' },
  { days: 7, label: '7 dana' },
] as const

type View = 'days' | 'all'

/** Štiklirano „kupljeno“ pamti samo ovaj telefon; ako storage nije dostupan, ekran radi bez toga. */
function useBought(programId: string | undefined) {
  const key = `ttz-nabavka-${programId ?? ''}`
  const [bought, setBought] = useState<ReadonlySet<string>>(() => {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem(key) ?? '[]') as string[])
    } catch {
      return new Set()
    }
  })
  const toggle = (name: string) => {
    const next = new Set(bought)
    if (!next.delete(name)) next.add(name)
    setBought(next)
    try {
      localStorage.setItem(key, JSON.stringify([...next]))
    } catch {
      // bez storage-a štikliranje važi samo dok je ekran otvoren
    }
  }
  return { bought, toggle }
}

const norm = (name: string) => name.toLocaleLowerCase('sr-Latn')

function Item({
  name,
  note,
  checked,
  onToggle,
}: {
  name: string
  note?: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <label className="flex min-h-btn cursor-pointer items-center gap-3 py-1">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-6 w-6 shrink-0 accent-[#4F8A00]"
        />
        <span className={cn('flex-1 text-lg', checked && 'text-muted line-through')}>{name}</span>
        {note && <span className="text-sm font-bold text-muted">{note}</span>}
      </label>
    </li>
  )
}

/** Plan nabavke namirnica po danima programa, sastavljen iz namirnica u obrocima plana ishrane. */
export default function Shopping() {
  const my = useMyProgram()
  const meals = useProgramMeals(my.program?.id)
  const { bought, toggle } = useBought(my.program?.id)
  const [range, setRange] = useState<(typeof RANGES)[number]['days']>(3)
  const [view, setView] = useState<View>('days')

  const from = Math.max(my.day, 1)
  const to = Math.min(from + range - 1, my.duration)
  const days = shoppingByDay(meals.data ?? [], from, to)
  const all = shoppingList(days)
  const hasAny = all.length > 0

  return (
    <Screen>
      <ScreenHeader
        title="Nabavka namirnica"
        subtitle={`Dan ${from}${to > from ? `–${to}` : ''} · po planu ishrane`}
        back="/app/ishrana"
      />

      <div role="group" aria-label="Za koliko dana" className="mt-5 flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.days}
            type="button"
            aria-pressed={range === r.days}
            onClick={() => setRange(r.days)}
            className={cn(
              'min-h-btn rounded-full px-5 font-extrabold',
              range === r.days ? 'bg-brand' : 'bg-card',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div role="group" aria-label="Prikaz" className="mt-3 flex gap-2">
        {(
          [
            ['days', 'Po danima'],
            ['all', 'Jedan spisak'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => setView(value)}
            className={cn(
              'min-h-btn rounded-full px-5 font-bold',
              view === value ? 'bg-ink text-white' : 'bg-card',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {meals.isPending && <Loading />}
      {meals.isError && <ErrorNote>Plan se nije učitao. Osveži stranicu.</ErrorNote>}

      {meals.isSuccess && !hasAny && (
        <Panel className="mt-4">
          <p className="text-muted">
            Za ove dane tim još nije upisao namirnice. Plan ishrane možeš da pratiš{' '}
            <Link to="/app/ishrana" className="font-bold text-brand-text underline">
              ovde
            </Link>
            .
          </p>
        </Panel>
      )}

      {hasAny && view === 'days' && (
        <ul className="mt-4 flex flex-col gap-3">
          {days.map((d) => (
            <li key={d.day} className="rounded-card-lg bg-card p-5">
              <h2 className="text-xl font-extrabold">
                Dan {d.day}
                {d.day === my.day && <span className="text-brand-text"> · danas</span>}
              </h2>
              {d.items.length === 0 ? (
                <p className="mt-2 text-muted">Za ovaj dan nema namirnica u planu.</p>
              ) : (
                <ul className="mt-2">
                  {d.items.map((name) => (
                    <Item
                      key={name}
                      name={name}
                      checked={bought.has(norm(name))}
                      onToggle={() => toggle(norm(name))}
                    />
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasAny && view === 'all' && (
        <section className="mt-4 rounded-card-lg bg-card p-5" aria-label="Jedan spisak">
          <ul>
            {all.map((item) => (
              <Item
                key={item.name}
                name={item.name}
                note={`Dan ${item.days.join(', ')}`}
                checked={bought.has(norm(item.name))}
                onToggle={() => toggle(norm(item.name))}
              />
            ))}
          </ul>
        </section>
      )}

      <Panel className="mt-4 bg-line/60">
        <p>
          Bez vaganja i merenja: kupuj po osećaju, dovoljno za dane koje pokrivaš. Ako menjaš obrok,
          lista se menja tek kad tim potvrdi zamenu.
        </p>
      </Panel>
    </Screen>
  )
}
