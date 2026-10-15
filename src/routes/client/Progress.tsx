import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMealLogDays, useMyMeasurements, useProgressPhotos, useUploadPhoto } from '@/api/client'
import { ErrorNote, Loading, Panel, Screen, ScreenHeader } from '@/components/client/ui'
import { useMyProgram } from '@/hooks/useMyProgram'
import { nextFeedbackDay } from '@/lib/programDay'

const kg = (n: number) => `${n.toLocaleString('sr-Latn-RS', { maximumFractionDigits: 1 })} kg`

interface Point {
  day: number
  weight: number | null
}

/** Grafikon težine na danima merenja (1, 10, 20, 30). Prazni dani su šuplji krugovi. */
function WeightChart({ points }: { points: Point[] }) {
  const W = 320
  const H = 150
  const xs = points.map((_, i) => 20 + (i * (W - 40)) / Math.max(points.length - 1, 1))
  const known = points.flatMap((p, i) => (p.weight === null ? [] : [{ x: xs[i], w: p.weight }]))
  const weights = known.map((k) => k.w)
  const min = Math.min(...weights, Infinity)
  const max = Math.max(...weights, -Infinity)
  const span = Math.max(max - min, 2)
  const y = (w: number) => 20 + ((max + span * 0.25 - w) / (span * 1.5)) * (H - 50)

  const line = known.map((k) => `${k.x},${y(k.w)}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Grafikon težine po danima merenja"
      className="mt-4 w-full"
    >
      <line x1="20" x2={W - 20} y1={H - 30} y2={H - 30} stroke="#E4E4DE" strokeDasharray="4 4" />
      {known.length > 1 && (
        <polyline
          points={line}
          fill="none"
          stroke="#4F8A00"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}
      {points.map((p, i) => (
        <g key={p.day}>
          {p.weight !== null ? (
            <circle cx={xs[i]} cy={y(p.weight)} r="7" fill="#4F8A00" />
          ) : (
            <circle cx={xs[i]} cy={H - 30} r="7" fill="#FFFFFF" stroke="#B5B5AE" strokeWidth="3" />
          )}
          <text
            x={xs[i]}
            y={H - 8}
            textAnchor="middle"
            fontSize="13"
            fontWeight={p.weight !== null ? 700 : 400}
            fill="#5E5E66"
          >
            Dan {p.day}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** Napredak (design/Napredak.png): težina, struk, praćenje plana, slike pre i posle. */
export default function Progress() {
  const my = useMyProgram()
  const programId = my.program?.id
  const measurements = useMyMeasurements(programId)
  const logDays = useMealLogDays(programId)
  const photos = useProgressPhotos(programId)
  const upload = useUploadPhoto(my.userId, programId)
  const front = useRef<HTMLInputElement>(null)
  const side = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState<string>()

  const byDay = new Map((measurements.data ?? []).map((m) => [m.program_day, m]))
  const measureDays = [1, 10, 20, 30].filter((d) => d <= my.duration)
  const points: Point[] = measureDays.map((d) => ({
    day: d,
    weight: byDay.get(d)?.weight_kg ?? null,
  }))
  const start = byDay.get(1)
  const latestWaist =
    [...(measurements.data ?? [])].reverse().find((m) => m.waist_cm !== null)?.waist_cm ?? null
  const trackedDays = logDays.data?.size ?? 0
  const nextMeasure =
    measureDays.find((d) => d >= my.day && !byDay.has(d)) ?? nextFeedbackDay(my.day, my.duration)

  const all = photos.data ?? []
  const first = all.find((p) => p.angle === 'front')
  const last = [...all]
    .reverse()
    .find((p) => p.angle === 'front' && p.program_day !== first?.program_day)

  const pick = (angle: 'front' | 'side') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoError(undefined)
    upload.mutate(
      { day: my.day, angle, file },
      {
        onError: (error) =>
          setPhotoError(error instanceof Error ? error.message : 'Slanje nije uspelo'),
      },
    )
  }

  return (
    <Screen>
      <ScreenHeader
        title="Napredak"
        back="/app/danas"
        right={
          <Link
            to="/app/feedback"
            className="flex min-h-btn items-center rounded-full bg-brand px-5 font-extrabold"
          >
            Feedback
          </Link>
        }
      />

      {measurements.isPending && <Loading />}
      {measurements.isError && <ErrorNote>Merenja se nisu učitala.</ErrorNote>}

      <Panel className="mt-5">
        <p className="text-muted">Početna težina · dan 1</p>
        <p className="mt-1 text-5xl font-extrabold">
          {start?.weight_kg != null ? kg(Number(start.weight_kg)) : '—'}
        </p>
        <WeightChart
          points={points.map((p) => ({
            ...p,
            weight: p.weight === null ? null : Number(p.weight),
          }))}
        />
      </Panel>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-card-lg bg-card p-4">
          <p className="text-sm text-muted">Struk</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-text">
            {latestWaist !== null
              ? `${Number(latestWaist).toLocaleString('sr-Latn-RS')} cm`
              : '+ Unesi'}
          </p>
        </div>
        <div className="rounded-card-lg bg-card p-4">
          <p className="text-sm text-muted">Plan praćen</p>
          <p className="mt-1 text-2xl font-extrabold">
            {trackedDays}/{Math.max(my.day, 1)} d
          </p>
        </div>
        <div className="rounded-card-lg bg-card p-4">
          <p className="text-sm text-muted">Sledeće merenje</p>
          <p className="mt-1 text-2xl font-extrabold">{nextMeasure ? `Dan ${nextMeasure}` : '—'}</p>
        </div>
      </div>

      <Panel className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-extrabold">Pre i posle</h2>
          <span className="text-sm text-muted">Vidi samo tvoj tim</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-card bg-line text-center text-muted">
            {first?.url ? (
              <img
                src={first.url}
                alt={`Dan ${first.program_day}, tvoja slika`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>Dan 1 · još nema slike</span>
            )}
          </div>
          <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-card border-2 border-dashed border-line text-center text-muted">
            {last?.url ? (
              <img
                src={last.url}
                alt={`Dan ${last.program_day}, tvoja slika`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>Dan {my.duration}</span>
            )}
          </div>
        </div>

        {(['front', 'side'] as const).map((angle) => (
          <input
            key={angle}
            ref={angle === 'front' ? front : side}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,.heic"
            className="sr-only"
            tabIndex={-1}
            data-testid={`progress-photo-${angle}`}
            onChange={pick(angle)}
          />
        ))}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={upload.isPending}
            onClick={() => front.current?.click()}
            className="min-h-[56px] rounded-full bg-ink font-extrabold text-white disabled:opacity-50"
          >
            {upload.isPending ? 'Šalje se…' : 'Dodaj sliku spreda'}
          </button>
          <button
            type="button"
            disabled={upload.isPending}
            onClick={() => side.current?.click()}
            className="min-h-[56px] rounded-full border border-ink font-extrabold disabled:opacity-50"
          >
            Dodaj sliku sa strane
          </button>
        </div>
        {photoError && <ErrorNote>{photoError}</ErrorNote>}
      </Panel>
    </Screen>
  )
}
