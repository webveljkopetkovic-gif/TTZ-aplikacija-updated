import { Panel, Screen, ScreenHeader } from '@/components/client/ui'
import { useMyProgram } from '@/hooks/useMyProgram'
import { cn } from '@/lib/cn'
import { calendarDays } from '@/lib/planMeals'
import { nextFeedbackDay } from '@/lib/programDay'

interface Milestone {
  key: string
  label: string
  title: string
  text: string
  from: number
  to: number
  tags: { label: string; tone: 'lime' | 'black' | 'gray' | 'outline' }[]
}

/** Vremenska linija programa (PLAN.md 4.7). `from`–`to` je raspon dana na koji se stavka odnosi. */
function milestones(duration: number, withTraining: boolean): Milestone[] {
  const train = withTraining ? [{ label: 'VEŽBE', tone: 'black' as const }] : []
  return [
    {
      key: 'start',
      label: 'DAN 1',
      title: 'Start',
      text: 'Početne mere i slike, podsetnici, prvi dan plana i prvi trening.',
      from: 1,
      to: 1,
      tags: [{ label: 'ISHRANA', tone: 'lime' }, ...train, { label: 'MERENJE', tone: 'gray' }],
    },
    {
      key: 'c1',
      label: 'DANI 1–14',
      title: '1. krug plana ishrane',
      text: `Obroci po podsetniku, suplementi svaki dan${withTraining ? ', trening 3 puta nedeljno' : ''}.`,
      from: 1,
      to: 14,
      tags: [{ label: 'ISHRANA', tone: 'lime' }, ...train],
    },
    {
      key: 'f10',
      label: 'DAN 10',
      title: 'Prvi feedback',
      text: '2 minuta pitanja i merenje. Tim odgovara za 48 sati na WhatsApp ili email.',
      from: 10,
      to: 10,
      tags: [
        { label: 'FEEDBACK', tone: 'outline' },
        { label: 'MERENJE', tone: 'gray' },
      ],
    },
    {
      key: 'c2',
      label: 'DAN 15',
      title: '2. krug plana',
      text: 'Isti 14-dnevni plan, sa izmenama iz tvog feedbacka.',
      from: 15,
      to: 15,
      tags: [{ label: 'ISHRANA', tone: 'lime' }],
    },
    {
      key: 'f20',
      label: 'DAN 20',
      title: 'Drugi feedback',
      text: `Proveravamo kako prijaju izmene.${withTraining ? ' Ognjen može da podigne nivo vežba.' : ''}`,
      from: 20,
      to: 20,
      tags: [{ label: 'FEEDBACK', tone: 'outline' }, { label: 'MERENJE', tone: 'gray' }, ...train],
    },
    {
      key: 'c3',
      label: 'DAN 29',
      title: '3. krug počinje',
      text: 'Plan ide ispočetka, sa svim izmenama do sada.',
      from: 29,
      to: 29,
      tags: [{ label: 'ISHRANA', tone: 'lime' }],
    },
    {
      key: 'f30',
      label: `DAN ${duration}`,
      title: 'Završni feedback i izveštaj',
      text: 'Mere, slike posle, izveštaj tima i predlog za dalje.',
      from: duration,
      to: duration,
      tags: [
        { label: 'FEEDBACK', tone: 'outline' },
        { label: 'MERENJE', tone: 'gray' },
      ],
    },
  ]
}

function Tag({
  tone,
  children,
}: {
  tone: 'lime' | 'black' | 'gray' | 'outline'
  children: string
}) {
  const tones = {
    lime: 'bg-brand text-ink',
    black: 'bg-ink text-white',
    gray: 'bg-line text-ink',
    outline: 'border border-chart text-brand-text',
  }
  return (
    <span className={cn('rounded-full px-3 py-1 text-xs font-extrabold', tones[tone])}>
      {children}
    </span>
  )
}

/** Tok programa · dan 1 do 30 (design/Tok programa · dan 1 do 30.png): kalendar i vremenska linija. */
export default function Journey() {
  const my = useMyProgram()
  const days = calendarDays(
    my.duration,
    my.day,
    my.program?.activated_at ?? null,
    my.trainingWeekdays,
    my.withTraining,
  )
  const feedbackDay = nextFeedbackDay(my.day, my.duration)
  const toFeedback = feedbackDay === null ? null : feedbackDay - my.day
  const steps = milestones(my.duration, my.withTraining)

  return (
    <Screen>
      <ScreenHeader
        title="Tok programa"
        subtitle={`${my.duration} dana · ishrana, suplementi${my.withTraining ? ' i vežbe' : ''}`}
        back="/app/danas"
      />

      <Panel className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-4xl font-extrabold">
            Dan {my.day} <span className="text-base font-normal text-muted">od {my.duration}</span>
          </p>
          {toFeedback !== null && (
            <p className="text-sm font-extrabold text-brand-text">
              {toFeedback === 0
                ? 'Feedback danas'
                : `Feedback za ${toFeedback} ${toFeedback === 1 ? 'dan' : 'dana'}`}
            </p>
          )}
        </div>

        <ol className="mt-4 grid grid-cols-7 gap-y-2" aria-label="Kalendar programa">
          {days.map((d) => (
            <li key={d.day} className="flex justify-center">
              <span
                aria-label={[
                  `Dan ${d.day}`,
                  d.isToday ? 'danas' : '',
                  d.isFeedback ? 'feedback' : '',
                  d.isCycleStart ? 'novi krug plana' : '',
                  d.isTraining ? 'trening' : '',
                ]
                  .filter(Boolean)
                  .join(', ')}
                aria-current={d.isToday ? 'date' : undefined}
                className={cn(
                  'flex h-12 w-12 flex-col items-center justify-center rounded-2xl text-lg font-bold',
                  d.isToday && 'bg-ink text-white',
                  !d.isToday && d.isFeedback && 'bg-brand',
                  !d.isToday && !d.isFeedback && d.isCycleStart && 'border-2 border-chart',
                  d.isPast && !d.isToday && !d.isFeedback && 'text-muted',
                )}
              >
                {d.day}
                {d.isTraining && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      '-mt-0.5 h-1.5 w-1.5 rounded-full',
                      d.isToday ? 'bg-brand' : 'bg-ink',
                    )}
                  />
                )}
              </span>
            </li>
          ))}
        </ol>

        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <li>■ Danas</li>
          <li>
            <span className="text-brand-text">■</span> Feedback
          </li>
          <li>□ Novi krug plana</li>
          {my.withTraining && <li>• Trening</li>}
        </ul>
      </Panel>

      <ol className="mt-6 flex flex-col">
        <li className="flex gap-4 pb-6">
          <span
            aria-hidden="true"
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand"
          >
            ✓
          </span>
          <div>
            <p className="text-sm font-extrabold text-brand-text">DAN 0</p>
            <p className="text-xl font-extrabold">Anketa, uplata i izrada plana</p>
            <p className="text-muted">Olgica pregleda nalaze i pravi plan, najviše 7 dana.</p>
          </div>
        </li>
        {steps.map((s) => {
          const current = my.day >= s.from && my.day <= s.to
          const past = my.day > s.to
          return (
            <li key={s.key} className="flex gap-4 pb-6" aria-current={current ? 'step' : undefined}>
              <span
                aria-hidden="true"
                className={cn(
                  'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  past && 'bg-brand',
                  current && 'bg-ink',
                  !past && !current && 'border-2 border-line',
                )}
              >
                {past ? '✓' : current ? <span className="h-3 w-3 rounded-full bg-brand" /> : null}
              </span>
              <div className={cn('min-w-0 flex-1', current && 'rounded-card-lg bg-brand p-5')}>
                <p className={cn('text-sm font-extrabold', !current && 'text-brand-text')}>
                  {current ? `${s.label} · DANAS` : s.label}
                </p>
                <p className="text-xl font-extrabold">{s.title}</p>
                <p className={cn(!current && 'text-muted')}>{s.text}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.tags.map((t) => (
                    <Tag key={t.label} tone={t.tone}>
                      {t.label}
                    </Tag>
                  ))}
                </div>
              </div>
            </li>
          )
        })}
        <li className="flex gap-4">
          <span
            aria-hidden="true"
            className="mt-1 h-8 w-8 shrink-0 rounded-full border-2 border-line"
          />
          <div>
            <p className="text-sm font-extrabold text-brand-text">POSLE DANA {my.duration}</p>
            <p className="text-xl font-extrabold">Nastavak ili kraj</p>
            <p className="text-muted">Novi plan kreće ponovo od dana 1, ili završavaš program.</p>
          </div>
        </li>
      </ol>
    </Screen>
  )
}
