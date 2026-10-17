import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSession } from '@/api/auth'
import {
  openReportPdf,
  usePublishReport,
  useProgramReport,
  useProgramResults,
  useSaveReportDraft,
  type ProgramReport,
  type Recommendation,
} from '@/api/end'
import { ApiError } from '@/api/functions'
import { useClientProfile, useClientProgram } from '@/api/team'
import { ErrorNote, Loading, Page, Section } from '@/components/team/ui'
import { ChoiceChip } from '@/components/ui'
import { change, formatChange, resultsSummary } from '@/lib/programResults'
import { findMealRuleViolation } from '@/lib/mealRules'

const when = (iso: string) =>
  new Intl.DateTimeFormat('sr-Latn', {
    timeZone: 'Europe/Belgrade',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))

const area =
  'mt-3 w-full resize-y rounded-[22px] border border-line bg-bg px-5 py-4 text-base placeholder:text-muted'

function Form({
  programId,
  clientId,
  withTraining,
  report,
}: {
  programId: string
  clientId: string
  withTraining: boolean
  report: ProgramReport | null
}) {
  const session = useSession()
  const publish = usePublishReport(programId)
  const draft = useSaveReportDraft(programId, session.data?.user.id)
  const [nutrition, setNutrition] = useState(report?.nutrition_note ?? '')
  const [training, setTraining] = useState(report?.training_note ?? '')
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    report?.recommendation ?? 'continue',
  )
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()

  const check = () => {
    for (const note of [nutrition, withTraining ? training : '']) {
      const violation = findMealRuleViolation(note)
      if (violation) {
        setError(`${violation}. Opiši bez brojeva i mera.`)
        return false
      }
    }
    setError(undefined)
    return true
  }
  const values = () => ({
    nutrition_note: nutrition.trim(),
    training_note: withTraining ? training.trim() : '',
    recommendation,
  })

  const saveDraft = async () => {
    setNotice(undefined)
    if (!check()) return
    try {
      await draft.mutateAsync(values())
      setNotice('Nacrt je sačuvan. Klijent ga ne vidi.')
    } catch {
      setError('Nacrt nije sačuvan. Pokušaj ponovo.')
    }
  }
  const send = async () => {
    setNotice(undefined)
    if (!check()) return
    if (nutrition.trim() === '') return setError('Upiši Olgicin deo izveštaja')
    try {
      const r = await publish.mutateAsync(values())
      setNotice(
        r.first_publish
          ? 'Izveštaj je objavljen. Klijent dobija poruku (WhatsApp + email).'
          : 'Izveštaj je ažuriran i PDF je osvežen.',
      )
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Izveštaj nije objavljen. Pokušaj ponovo.')
    }
  }

  const options: { value: Recommendation; label: string }[] = [
    { value: 'continue', label: 'Nastavak 30 dana' },
    ...(withTraining ? [{ value: 'nutrition_only' as const, label: 'Samo ishrana' }] : []),
    { value: 'end', label: 'Završava za sada' },
  ]

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void send()
      }}
      className="flex flex-col gap-4"
    >
      <Section title="Olgica · ishrana i suplementi">
        <label htmlFor="report-nutrition" className="sr-only">
          Olgicin deo izveštaja
        </label>
        <textarea
          id="report-nutrition"
          rows={5}
          maxLength={1500}
          value={nutrition}
          onChange={(e) => setNutrition(e.target.value)}
          placeholder="Šta je radilo, kako su se menjali glad, energija i varenje, šta predlažeš (bez grama i kalorija)."
          className={area}
        />
      </Section>

      {withTraining && (
        <Section title="Ognjen · vežbe">
          <label htmlFor="report-training" className="sr-only">
            Ognjenov deo izveštaja
          </label>
          <textarea
            id="report-training"
            rows={4}
            maxLength={1500}
            value={training}
            onChange={(e) => setTraining(e.target.value)}
            placeholder="Kako je išlo sa treninzima i da li je spremna za sledeći nivo."
            className={area}
          />
        </Section>
      )}

      <Section title="Predlog za dalje">
        <div role="radiogroup" aria-label="Predlog za dalje" className="flex flex-wrap gap-2">
          {options.map((o) => (
            <ChoiceChip
              key={o.value}
              role="radio"
              aria-checked={recommendation === o.value}
              selected={recommendation === o.value}
              onClick={() => setRecommendation(o.value)}
              className="min-h-[48px]"
            >
              {o.label}
            </ChoiceChip>
          ))}
        </div>
      </Section>

      {error && <ErrorNote>{error}</ErrorNote>}
      {notice && (
        <p role="status" className="font-bold text-brand-text">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={publish.isPending}
          className="min-h-[56px] flex-1 rounded-full bg-brand px-6 text-lg font-extrabold text-ink disabled:opacity-50"
        >
          {publish.isPending
            ? 'Objavljujem…'
            : report?.published_at
              ? 'Ažuriraj izveštaj'
              : 'Objavi izveštaj'}
        </button>
        <button
          type="button"
          disabled={draft.isPending}
          onClick={() => void saveDraft()}
          className="min-h-[56px] rounded-full border border-line bg-card px-6 text-lg font-extrabold disabled:opacity-50"
        >
          Sačuvaj nacrt
        </button>
      </div>
      <Link
        to={`/tim/klijenti/${clientId}`}
        className="min-h-btn font-bold text-brand-text underline"
      >
        ← Nazad na karton klijenta
      </Link>
    </form>
  )
}

/** Završni izveštaj tima (PLAN.md 4.7): rezultati programa, tekst Olgice i Ognjena, objava i PDF. */
export default function TeamReport() {
  const { id } = useParams()
  const profile = useClientProfile(id)
  const program = useClientProgram(id)
  const programId = program.data?.id
  const results = useProgramResults(programId)
  const report = useProgramReport(programId)
  const [pdfError, setPdfError] = useState(false)

  if (profile.isPending || program.isPending || report.isPending) {
    return (
      <Page>
        <Loading />
      </Page>
    )
  }
  if (!program.data || !id) {
    return (
      <Page>
        <ErrorNote>Program nije pronađen.</ErrorNote>
      </Page>
    )
  }

  const withTraining = program.data.products?.kind === 'nutrition_training'
  const r = results.data
  const published = report.data?.published_at ? report.data : null

  return (
    <Page>
      <Link
        to={`/tim/klijenti/${id}`}
        className="inline-flex min-h-btn items-center font-bold text-muted"
      >
        ← KARTON
      </Link>
      <h1 className="mt-1 text-4xl font-extrabold leading-tight">
        Završni izveštaj · {profile.data?.full_name ?? 'klijent'}
      </h1>
      <p className="mt-1 text-muted">
        {program.data.products?.name}
        {program.data.plan_focus ? ` · ${program.data.plan_focus}` : ''}
      </p>

      {r && (
        <Section title="Rezultati programa" className="mt-5">
          <p className="text-muted">{resultsSummary(r, withTraining)}</p>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-card bg-bg p-3">
              <dt className="text-sm text-muted">Težina</dt>
              <dd className="text-xl font-extrabold">
                {formatChange(change(r.start_weight_kg, r.end_weight_kg), 'kg')}
              </dd>
            </div>
            <div className="rounded-card bg-bg p-3">
              <dt className="text-sm text-muted">Struk</dt>
              <dd className="text-xl font-extrabold">
                {formatChange(change(r.start_waist_cm, r.end_waist_cm), 'cm')}
              </dd>
            </div>
            <div className="rounded-card bg-bg p-3">
              <dt className="text-sm text-muted">Plan praćen</dt>
              <dd className="text-xl font-extrabold">
                {r.followed_days}/{r.duration_days} d
              </dd>
            </div>
          </dl>
        </Section>
      )}

      {published && (
        <p role="status" className="mt-4 rounded-card bg-card p-4 font-semibold">
          Objavljeno {when(published.published_at!)}
          {published.pdf_path && (
            <button
              type="button"
              className="font-bold text-brand-text underline"
              onClick={() => {
                setPdfError(false)
                openReportPdf(published.pdf_path!).catch(() => setPdfError(true))
              }}
            >
              Otvori PDF
            </button>
          )}
          {pdfError && <span className="text-danger"> PDF se nije otvorio.</span>}
        </p>
      )}

      <div className="mt-5">
        <Form
          key={program.data.id}
          programId={program.data.id}
          clientId={id}
          withTraining={withTraining}
          report={report.data ?? null}
        />
      </div>
    </Page>
  )
}
