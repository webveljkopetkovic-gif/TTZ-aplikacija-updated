import { useRef, useState } from 'react'
import { useAddLabFile } from '@/api/programs'
import { useMyLabFiles, useMySupplements } from '@/api/client'
import { ErrorNote, Loading, Panel, Screen, ScreenHeader } from '@/components/client/ui'
import { Link } from 'react-router-dom'
import { useMyProgram } from '@/hooks/useMyProgram'

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('sr-Latn-RS', {
    timeZone: 'Europe/Belgrade',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso))

/** Suplementi i nalazi (design/Suplementi i nalazi.png): protokol i laboratorijski nalazi. */
export default function Supplements() {
  const my = useMyProgram()
  const supplements = useMySupplements(my.program?.id)
  const labs = useMyLabFiles(my.userId)
  const addFile = useAddLabFile(my.userId)
  const input = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState<string>()

  const refresh = () => labs.refetch()

  return (
    <Screen>
      <ScreenHeader
        title="Moj protokol"
        subtitle="Olgica · po tvojim nalazima i anketi"
        back="/app/danas"
      />

      <div role="tablist" aria-label="Plan" className="mt-5 flex gap-2">
        <Link
          to="/app/ishrana"
          className="flex min-h-btn items-center rounded-full bg-card px-5 font-bold"
        >
          Ishrana
        </Link>
        <span
          role="tab"
          aria-selected="true"
          className="flex min-h-btn items-center rounded-full bg-brand px-5 font-extrabold"
        >
          Suplementi
        </span>
      </div>

      {supplements.isPending && <Loading />}
      {supplements.isError && <ErrorNote>Protokol se nije učitao.</ErrorNote>}
      <ul className="mt-5 flex flex-col gap-3">
        {(supplements.data ?? []).map((s) => (
          <li key={s.id}>
            <Panel>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-2xl font-extrabold">{s.name}</h2>
                <span className="font-extrabold text-brand-text">{s.timing}</span>
              </div>
              <p className="mt-2 text-muted">Doza: prema protokolu</p>
              {s.note && (
                <p className="mt-1">
                  <span className="font-extrabold">Zašto:</span> {s.note}
                </p>
              )}
            </Panel>
          </li>
        ))}
        {supplements.isSuccess && (supplements.data ?? []).length === 0 && (
          <li className="rounded-card-lg bg-card p-5 text-muted">
            Olgica još nije dodala suplemente.
          </li>
        )}
      </ul>
      <p className="mt-3 text-sm text-muted">Plan podrške ne zamenjuje lekarsku terapiju.</p>

      <h2 className="mt-8 text-2xl font-extrabold">Laboratorijski nalazi</h2>
      <Panel className="mt-3 px-5 py-2">
        <ul>
          {(labs.data ?? []).map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-4 border-b border-line py-4 last:border-0"
            >
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-line"
              >
                ▤
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-extrabold">{l.label ?? 'Nalaz'}</span>
                <span className="block text-muted">{fmt(l.uploaded_at)}</span>
              </span>
            </li>
          ))}
          {labs.isSuccess && (labs.data ?? []).length === 0 && (
            <li className="py-4 text-muted">Još nema nalaza.</li>
          )}
        </ul>
      </Panel>

      <input
        ref={input}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.heic"
        className="sr-only"
        tabIndex={-1}
        data-testid="lab-upload"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setFileError(undefined)
          addFile.mutate(file, {
            onSuccess: () => void refresh(),
            onError: (error) =>
              setFileError(error instanceof Error ? error.message : 'Slanje nije uspelo'),
          })
        }}
      />
      <button
        type="button"
        disabled={addFile.isPending}
        onClick={() => input.current?.click()}
        className="mt-4 flex min-h-[72px] w-full items-center justify-center gap-3 rounded-card-lg border-2 border-dashed border-line font-extrabold"
      >
        <span aria-hidden="true" className="text-brand-text">
          ↑
        </span>
        {addFile.isPending ? 'Šalje se…' : 'Otpremi nove nalaze'}
      </button>
      {fileError && <ErrorNote>{fileError}</ErrorNote>}
    </Screen>
  )
}
