import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProfile, useSession } from '@/api/auth'
import {
  openLabFile,
  useAddTeamNote,
  useClientFeedbacks,
  useClientLabFiles,
  useClientMeasurements,
  useClientPastPrograms,
  useClientProfile,
  useClientProgram,
  useSupplements,
  useTeamNotes,
} from '@/api/team'
import { useProgramResults } from '@/api/end'
import { ErrorNote, Loading, OwnerTag, Page, Row, Section, StatusPill } from '@/components/team/ui'
import { Avatar, Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import {
  answerCount,
  dossierSections,
  dossierSummary,
  trainingView,
  type IntakeRow,
} from '@/lib/dossierView'
import { EXERCISE_LEVEL_LABEL, type ExerciseLevel } from '@/lib/labels'
import { change, formatChange } from '@/lib/programResults'
import { belgradeDate, programDay } from '@/lib/programDay'

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('sr-Latn-RS', {
    timeZone: 'Europe/Belgrade',
    day: 'numeric',
    month: 'numeric',
  }).format(new Date(iso))

const FEEDBACK_STATUS: Record<string, string> = {
  open: 'čeka klijenta',
  submitted: 'stigao, čeka odgovor',
  late: 'kasni',
  answered: 'odgovoreno',
}

const WEEKDAYS = ['pon', 'uto', 'sre', 'čet', 'pet', 'sub', 'ned']

function Delta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-bg p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-brand-text">{value}</p>
    </div>
  )
}

function PastProgram({
  id,
  name,
  status,
  activatedAt,
}: {
  id: string
  name?: string
  status: string
  activatedAt: string | null
}) {
  const results = useProgramResults(id)
  const r = results.data
  return (
    <li className="rounded-2xl bg-bg p-4">
      <p className="font-extrabold">
        {name ?? 'Program'} · {activatedAt ? fmtDate(activatedAt) : '—'}
      </p>
      <p className="text-sm text-muted">
        {status === 'renewed' ? 'nastavljen' : status === 'ended' ? 'završen' : status}
        {r
          ? ` · težina ${formatChange(change(r.start_weight_kg, r.end_weight_kg), 'kg')}, struk ${formatChange(change(r.start_waist_cm, r.end_waist_cm), 'cm')}, plan praćen ${r.followed_days}/${r.duration_days} d`
          : ''}
      </p>
    </li>
  )
}

/** Karton klijenta (design/Zdravstveni dosije (ceo).png). Beleške tima vidi samo tim. */
export default function TeamDossier() {
  const { id } = useParams()
  const session = useSession()
  const me = useProfile(session.data?.user.id)
  const profile = useClientProfile(id)
  const program = useClientProgram(id)
  const programId = program.data?.id
  const labs = useClientLabFiles(id)
  const measurements = useClientMeasurements(programId)
  const results = useProgramResults(programId)
  const past = useClientPastPrograms(id, programId)
  const feedbacks = useClientFeedbacks(programId)
  const supplements = useSupplements(programId)
  const notes = useTeamNotes(id)
  const addNote = useAddTeamNote(id, session.data?.user.id)
  const [allAnswers, setAllAnswers] = useState(false)
  const [note, setNote] = useState('')
  const [labError, setLabError] = useState<string>()

  if (profile.isPending || program.isPending) {
    return (
      <Page>
        <Loading />
      </Page>
    )
  }
  if (!profile.data) {
    return (
      <Page>
        <ErrorNote>Klijent nije pronađen.</ErrorNote>
      </Page>
    )
  }

  const p = program.data
  const intake = p?.intake_surveys as unknown as
    (IntakeRow & { submitted_at: string; sex: string }) | null
  const day = p ? programDay(p.activated_at, belgradeDate()) : 0
  const withTraining = p?.products?.kind === 'nutrition_training'
  const training = trainingView(intake?.answers)
  const first = measurements.data?.[0]
  const last = measurements.data?.at(-1)
  const hasDelta = !!first && !!last && first.program_day !== last.program_day
  const name = profile.data.full_name ?? profile.data.email
  const phone = profile.data.phone?.replace(/[^\d+]/g, '') ?? ''

  return (
    <Page>
      <Link to="/tim/klijenti" className="inline-flex min-h-btn items-center font-bold text-muted">
        ← KARTON KLIJENTA
      </Link>

      <header className="mt-2 flex items-center gap-4">
        <Avatar name={name} tone="client" size="lg" />
        <div>
          <h1 className="text-3xl font-extrabold leading-tight">{name}</h1>
          <p className="text-muted">
            {p ? `dan ${day} programa` : 'bez programa'}
            {p?.products?.name ? ` · ${p.products.name}` : ''}
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-3">
        {phone && (
          <a
            href={`https://wa.me/${phone.replace('+', '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-btn items-center rounded-full bg-brand px-5 font-bold"
          >
            WhatsApp
          </a>
        )}
        <a
          href={`mailto:${profile.data.email}`}
          className="flex min-h-btn items-center rounded-full bg-card px-5 font-bold"
        >
          Email
        </a>
      </div>
      <p className="mt-3 text-sm text-muted">
        {profile.data.email} · {profile.data.phone ?? 'bez telefona'} · odgovor ide porukom, ne
        pozivom
      </p>

      {!p && <ErrorNote>Klijent još nema program.</ErrorNote>}

      {p && (
        <div className="mt-6 flex flex-col gap-5">
          {intake && (
            <Section
              title="Zdravstveno stanje"
              right={<span className="text-sm text-muted">iz početne ankete</span>}
            >
              <dl>
                {dossierSummary(intake).map((r) => (
                  <Row key={r.label} {...r} />
                ))}
              </dl>
              <Button
                variant="soft"
                block
                className="mt-4"
                aria-expanded={allAnswers}
                onClick={() => setAllAnswers((v) => !v)}
              >
                Svi odgovori iz ankete ({answerCount(intake.answers)})
              </Button>
              {allAnswers && (
                <div className="mt-4 flex flex-col gap-5">
                  {dossierSections(intake).map((s) => (
                    <div key={s.title}>
                      <h3 className="font-extrabold">{s.title}</h3>
                      <dl>
                        {s.rows.map((r) => (
                          <Row key={r.label} {...r} />
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {withTraining && (
            <Section title="Upitnik za vežbe" right={<OwnerTag who="ognjen" />}>
              {!training.answered ? (
                <p className="text-muted">Klijent nije popunio Ognjenova pitanja.</p>
              ) : (
                <>
                  {training.flags.length > 0 && (
                    <div role="note" className="mb-4 rounded-card border border-danger p-4">
                      <p className="font-extrabold text-danger">Pogledaj pre izrade plana</p>
                      <ul className="mt-1 list-disc pl-5">
                        {training.flags.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="mb-2 font-bold">
                    Predlog nivoa: {EXERCISE_LEVEL_LABEL[training.suggested]}{' '}
                    <span className="font-normal text-muted">(potvrđuje Ognjen)</span>
                  </p>
                  <dl>
                    {training.rows.map((r) => (
                      <Row key={r.label} {...r} />
                    ))}
                  </dl>
                </>
              )}
            </Section>
          )}

          <Section
            title="Rezultati"
            right={<span className="text-sm text-muted">isti brojevi kao kod klijenta</span>}
          >
            {results.data && hasDelta ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Delta
                  label="Težina"
                  value={formatChange(
                    change(results.data.start_weight_kg, results.data.end_weight_kg),
                    'kg',
                  )}
                />
                <Delta
                  label="Struk"
                  value={formatChange(
                    change(results.data.start_waist_cm, results.data.end_waist_cm),
                    'cm',
                  )}
                />
                <Delta
                  label="Energija ujutru"
                  value={
                    first?.energy_am != null && last?.energy_am != null
                      ? `${first.energy_am} → ${last.energy_am}`
                      : '—'
                  }
                />
                <Delta
                  label="Plan praćen"
                  value={`${results.data.followed_days}/${results.data.duration_days} d`}
                />
                {withTraining && <Delta label="Treninga" value={`${results.data.workouts_done}`} />}
                <Delta label="Feedbacka" value={`${results.data.feedbacks_done}`} />
              </div>
            ) : (
              <p className="text-muted">
                {measurements.data?.length
                  ? 'Za poređenje treba bar još jedno merenje.'
                  : 'Još nema merenja.'}
              </p>
            )}
            {(measurements.data?.length ?? 0) > 0 && (
              <ul className="mt-3 text-sm text-muted">
                {measurements.data!.map((m) => (
                  <li key={m.program_day}>
                    Dan {m.program_day}: {m.weight_kg ?? '—'} kg · struk {m.waist_cm ?? '—'} cm
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {(past.data?.length ?? 0) > 0 && (
            <Section title="Raniji programi">
              <ul className="flex flex-col gap-3">
                {past.data!.map((g) => (
                  <PastProgram
                    key={g.id}
                    id={g.id}
                    name={g.products?.name}
                    status={g.status}
                    activatedAt={g.activated_at}
                  />
                ))}
              </ul>
            </Section>
          )}

          <Section
            title="Feedback hronologija"
            right={<span className="text-sm text-muted">na 10 dana</span>}
          >
            <ul className="flex flex-col gap-3">
              {(feedbacks.data ?? []).map((f) => (
                <li
                  key={f.id}
                  className={cn('rounded-2xl p-4', f.status === 'submitted' ? 'bg-brand' : 'bg-bg')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-extrabold">
                      Dan {f.due_day} · {FEEDBACK_STATUS[f.status] ?? f.status}
                    </p>
                    {f.status === 'submitted' && (
                      <Link to={`/tim/feedback/${f.id}`} className="font-bold underline">
                        Odgovori →
                      </Link>
                    )}
                  </div>
                  {f.feedback_replies?.[0] && (
                    <p className="mt-1 text-muted">Tim: {f.feedback_replies[0].body}</p>
                  )}
                </li>
              ))}
              <li className="rounded-2xl bg-bg p-4">
                <p className="font-extrabold">Dan 0 · početna anketa</p>
                <p className="text-muted">
                  {intake ? `${answerCount(intake.answers)} odgovora` : 'bez ankete'}
                  {labs.data ? `, ${labs.data.length} nalaza` : ''}
                </p>
              </li>
            </ul>
          </Section>

          <Section title="Laboratorijski nalazi">
            {(labs.data ?? []).length === 0 && <p className="text-muted">Nema dodatih nalaza.</p>}
            <ul>
              {(labs.data ?? []).map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0"
                >
                  <span>
                    <span className="block font-bold">{l.label ?? 'Nalaz'}</span>
                    <span className="text-sm text-muted">{fmtDate(l.uploaded_at)}</span>
                  </span>
                  <button
                    type="button"
                    className="min-h-btn font-bold text-brand-text underline"
                    onClick={() =>
                      openLabFile(l.storage_path).catch((e: Error) => setLabError(e.message))
                    }
                  >
                    Otvori
                  </button>
                </li>
              ))}
            </ul>
            {labError && <ErrorNote>{labError}</ErrorNote>}
          </Section>

          <Section
            title="Aktivan plan"
            right={<StatusPill status={p.status === 'building_plan' ? 'new_plan' : p.status} />}
          >
            <dl>
              <Row label="Ishrana" value={p.plan_focus ?? 'fokus nije upisan'} />
              <Row
                label="Suplementi"
                value={(supplements.data ?? []).map((s) => s.name).join(', ') || '—'}
              />
              {withTraining && (
                <Row
                  label="Vežbe"
                  value={
                    p.exercise_level
                      ? `${EXERCISE_LEVEL_LABEL[p.exercise_level as ExerciseLevel]} · ${p.training_weekdays.length}× nedeljno (${p.training_weekdays.map((d) => WEEKDAYS[d - 1]).join(', ')})`
                      : 'nivo nije izabran'
                  }
                />
              )}
            </dl>
            <Link
              to={`/tim/klijenti/${id}/plan`}
              className="mt-4 flex min-h-[52px] items-center justify-center rounded-full border border-line bg-bg font-extrabold"
            >
              {p.status === 'building_plan' ? 'Napravi plan' : 'Izmeni plan'}
            </Link>
            {['active', 'ended', 'renewed'].includes(p.status) && (
              <Link
                to={`/tim/klijenti/${id}/izvestaj`}
                className="mt-3 flex min-h-[52px] items-center justify-center rounded-full bg-brand font-extrabold"
              >
                Završni izveštaj
              </Link>
            )}
          </Section>

          <section className="rounded-card-lg border-2 border-dashed border-line p-6">
            <h2 className="text-lg font-extrabold">Beleške tima (klijent ne vidi)</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {(notes.data ?? []).map((n) => (
                <li key={n.id}>
                  <p>{n.body}</p>
                  <p className="text-sm text-muted">
                    {n.profiles?.full_name ?? 'Tim'} · {fmtDate(n.created_at)}
                  </p>
                </li>
              ))}
              {(notes.data ?? []).length === 0 && <li className="text-muted">Nema beleški.</li>}
            </ul>
            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                const body = note.trim()
                if (body) addNote.mutate(body, { onSuccess: () => setNote('') })
              }}
            >
              <label htmlFor="team-note" className="sr-only">
                Nova beleška
              </label>
              <textarea
                id="team-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={`Nova beleška (${me.data?.full_name ?? 'tim'})`}
                className="w-full resize-none rounded-[22px] border border-line bg-card px-5 py-4"
              />
              <Button
                type="submit"
                variant="black"
                disabled={addNote.isPending || note.trim() === ''}
              >
                Dodaj belešku
              </Button>
              {addNote.isError && <ErrorNote>Beleška nije sačuvana.</ErrorNote>}
            </form>
          </section>
        </div>
      )}
    </Page>
  )
}
