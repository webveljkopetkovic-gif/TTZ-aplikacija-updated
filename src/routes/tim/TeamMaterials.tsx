import { useState } from 'react'
import { useSession } from '@/api/auth'
import {
  useCreateTemplate,
  useDeleteTemplate,
  useDeleteWorkout,
  useMealTemplates,
  useSaveTemplateItem,
  useSaveWorkout,
  useTemplateItems,
  useWorkouts,
} from '@/api/team'
import { MealEditor } from '@/components/team/MealEditor'
import { ErrorNote, Loading, Page, Section } from '@/components/team/ui'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { EXERCISE_LEVEL_LABEL, type ExerciseLevel } from '@/lib/labels'
import { findMealRuleViolation } from '@/lib/mealRules'

type Tab = 'videos' | 'templates'
const LEVELS: ExerciseLevel[] = ['beginner', 'intermediate', 'advanced']

const field = 'min-h-[48px] w-full rounded-full border border-line bg-bg px-5'

function WorkoutForm() {
  const save = useSaveWorkout()
  const [level, setLevel] = useState<ExerciseLevel>('beginner')
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState('20')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string>()

  const submit = async () => {
    const duration = Number(minutes)
    if (title.trim() === '') return setError('Upiši naziv')
    if (!Number.isInteger(duration) || duration < 1 || duration > 180)
      return setError('Trajanje je od 1 do 180 minuta')
    if (!/^https:\/\//i.test(url.trim())) return setError('Link videa mora da počinje sa https://')
    setError(undefined)
    try {
      await save.mutateAsync({
        level,
        title: title.trim(),
        duration_min: duration,
        video_url: url.trim(),
        description: description.trim(),
      })
      setTitle('')
      setUrl('')
      setDescription('')
    } catch {
      setError('Video nije sačuvan. Pokušaj ponovo.')
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-card bg-bg p-4">
      <h3 className="font-extrabold">Novi video</h3>
      <select
        aria-label="Nivo"
        value={level}
        onChange={(e) => setLevel(e.target.value as ExerciseLevel)}
        className={field}
      >
        {LEVELS.map((l) => (
          <option key={l} value={l}>
            {EXERCISE_LEVEL_LABEL[l]}
          </option>
        ))}
      </select>
      <input
        aria-label="Naziv videa"
        placeholder="Naziv (npr. Snaga za početnike)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={field}
      />
      <input
        aria-label="Trajanje u minutima"
        inputMode="numeric"
        placeholder="Trajanje (min)"
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
        className={field}
      />
      <input
        aria-label="Link videa"
        type="url"
        placeholder="https://… (Vimeo, Bunny, YouTube unlisted)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className={field}
      />
      <input
        aria-label="Opis"
        placeholder="Kratak opis"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className={field}
      />
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button disabled={save.isPending} onClick={submit}>
        {save.isPending ? 'Čuvam…' : 'Dodaj video'}
      </Button>
    </div>
  )
}

function Workouts() {
  const workouts = useWorkouts()
  const remove = useDeleteWorkout()
  const list = workouts.data ?? []

  return (
    <>
      {workouts.isPending && <Loading />}
      {workouts.isError && <ErrorNote>Video vežbe se nisu učitale.</ErrorNote>}
      {LEVELS.map((level) => {
        const items = list.filter((w) => w.level === level)
        return (
          <Section
            key={level}
            title={`Celo telo · ${EXERCISE_LEVEL_LABEL[level].toLowerCase()}`}
            className="mt-4"
          >
            {items.length === 0 && <p className="text-muted">Još nema videa za ovaj nivo.</p>}
            <ul>
              {items.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center gap-3 border-b border-line py-3 last:border-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold">{w.title}</span>
                    <span className="block text-sm text-muted">
                      {w.duration_min} min{w.description ? ` · ${w.description}` : ''}
                    </span>
                  </span>
                  <a
                    href={w.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-btn content-center font-bold text-brand-text underline"
                  >
                    Otvori
                  </a>
                  <button
                    type="button"
                    aria-label={`Obriši ${w.title}`}
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Obrisati „${w.title}“?`)) remove.mutate(w.id)
                    }}
                    className="min-h-btn px-2 font-bold text-danger"
                  >
                    Obriši
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )
      })}
      <WorkoutForm />
    </>
  )
}

function TemplateEditor({ templateId }: { templateId: string }) {
  const items = useTemplateItems(templateId)
  const save = useSaveTemplateItem(templateId)
  return (
    <div className="mt-4">
      {items.isPending && <Loading />}
      {items.data && <MealEditor items={items.data} onSave={(m) => save.mutateAsync(m)} />}
    </div>
  )
}

function Templates() {
  const session = useSession()
  const templates = useMealTemplates()
  const create = useCreateTemplate(session.data?.user.id)
  const remove = useDeleteTemplate()
  const [open, setOpen] = useState<string>()
  const [name, setName] = useState('')
  const [condition, setCondition] = useState('')
  const [error, setError] = useState<string>()

  const add = async () => {
    if (name.trim().length < 3) return setError('Upiši naziv šablona')
    const violation = findMealRuleViolation(name)
    if (violation) return setError(`${violation} u nazivu`)
    setError(undefined)
    try {
      const id = await create.mutateAsync({ name: name.trim(), condition: condition.trim() })
      setName('')
      setCondition('')
      setOpen(id)
    } catch {
      setError('Šablon nije sačuvan. Pokušaj ponovo.')
    }
  }

  return (
    <>
      {templates.isPending && <Loading />}
      {templates.isError && <ErrorNote>Šabloni se nisu učitali.</ErrorNote>}
      <ul className="flex flex-col gap-3">
        {(templates.data ?? []).map((t) => (
          <li key={t.id} className="rounded-card-lg bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold">{t.name}</span>
                <span className="block text-sm text-muted">
                  {t.condition ?? '14 dana · 5 obroka dnevno'}
                </span>
              </span>
              <Button
                variant="soft"
                aria-expanded={open === t.id}
                onClick={() => setOpen(open === t.id ? undefined : t.id)}
              >
                {open === t.id ? 'Zatvori' : 'Uredi'}
              </Button>
            </div>
            {open === t.id && (
              <>
                <TemplateEditor templateId={t.id} />
                <button
                  type="button"
                  className="mt-4 min-h-btn font-bold text-danger"
                  onClick={() => {
                    if (window.confirm(`Obrisati šablon „${t.name}“? Planovi klijenata ostaju.`)) {
                      remove.mutate(t.id)
                      setOpen(undefined)
                    }
                  }}
                >
                  Obriši šablon
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-3 rounded-card bg-bg p-4">
        <h3 className="font-extrabold">Novi šablon</h3>
        <input
          aria-label="Naziv šablona"
          placeholder="Npr. Štitna žlezda · 14 dana"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
        />
        <input
          aria-label="Stanje"
          placeholder="Stanje (npr. Hipotireoza)"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className={field}
        />
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button disabled={create.isPending} onClick={add}>
          {create.isPending ? 'Čuvam…' : 'Napravi šablon'}
        </Button>
      </div>
    </>
  )
}

/** Materijali (design/Materijali (tim).png): video vežbe i šabloni ishrane. Recepti su deo obroka u šablonu. */
export default function TeamMaterials() {
  const [tab, setTab] = useState<Tab>('videos')
  return (
    <Page>
      <h1 className="text-4xl font-extrabold">Materijali</h1>
      <p className="mt-1 text-muted">Snimi jednom, koristi za sve klijente</p>

      <div role="tablist" aria-label="Materijali" className="mt-5 flex gap-2">
        {(
          [
            ['videos', 'Video vežbe'],
            ['templates', 'Planovi ishrane'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              'min-h-btn rounded-full px-5 font-bold',
              tab === value ? 'bg-ink text-white' : 'bg-card',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-5">
        {tab === 'videos' ? <Workouts /> : <Templates />}
      </div>
    </Page>
  )
}
