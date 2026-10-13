import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '@/api/functions'
import { removeIntakeFile, uploadIntakeFile, useSubmitIntake } from '@/api/intake'
import { ChoiceChips, FileUploadList, Question, type UploadItem } from '@/components/form'
import { Checkbox } from '@/components/ui'
import { useIntakeDraft } from '@/hooks/useIntakeDraft'
import { useStepForm } from '@/hooks/useStepForm'
import { loadDraft, savePending } from '@/lib/intakeDraft'
import {
  CHANNEL_OPTIONS,
  intakeSchema,
  LAB_FILE_EXTENSIONS,
  MAX_LAB_FILE_BYTES,
  MAX_LAB_FILES,
  stepOfField,
  type LabFileRef,
} from '@/lib/intakeSchema'
import { AnketaLayout } from './AnketaLayout'

const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

export default function Step5Consent() {
  const navigate = useNavigate()
  const submitIntake = useSubmitIntake()
  const [transient, setTransient] = useState<UploadItem[]>([])
  const [formError, setFormError] = useState<string>()

  const { clear } = useIntakeDraft()
  const { form, draft, submit, reg, setValue, errorOf, values } = useStepForm(5, async () => {
    setFormError(undefined)
    const current = loadDraft()
    const parsed = intakeSchema.safeParse(current.values)
    if (!parsed.success) {
      // vraćamo korisnika na prvi korak u kom nešto nedostaje
      const first = parsed.error.issues[0]
      const step = stepOfField(String(first.path[0])) ?? 1
      navigate(`/anketa/${step}`)
      return
    }
    try {
      const result = await submitIntake.mutateAsync({
        intakeId: current.intakeId,
        answers: current.values,
      })
      savePending({ intakeId: result.intake_id, email: result.email })
      clear()
      navigate(`/plan?intake=${result.intake_id}`)
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Slanje nije uspelo. Pokušaj ponovo.',
      )
    }
  })

  const labFiles: LabFileRef[] = values.lab_files ?? []
  const items: UploadItem[] = [
    ...labFiles.map((f) => ({
      id: f.path,
      name: f.name,
      size: f.size,
      type: f.type,
      status: 'done' as const,
    })),
    ...transient,
  ]
  const channels = values.channels ?? []

  const addFiles = (files: File[]) => {
    setFormError(undefined)
    let count = labFiles.length + transient.filter((t) => t.status === 'uploading').length
    for (const file of files) {
      const id = crypto.randomUUID()
      const base = { id, name: file.name, size: file.size, type: file.type }
      const reject = (error: string) =>
        setTransient((prev) => [...prev, { ...base, status: 'error', error }])

      if (!(LAB_FILE_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) {
        reject('Dozvoljeni su PDF, JPG, PNG i HEIC')
      } else if (file.size > MAX_LAB_FILE_BYTES) {
        reject('Fajl je veći od 10 MB')
      } else if (count >= MAX_LAB_FILES) {
        reject('Najviše 10 fajlova')
      } else {
        count += 1
        setTransient((prev) => [...prev, { ...base, status: 'uploading' }])
        uploadIntakeFile(draft.intakeId, file)
          .then((ref) => {
            const current = (form.getValues('lab_files') ?? []) as LabFileRef[]
            setValue('lab_files', [...current, ref])
            setTransient((prev) => prev.filter((t) => t.id !== id))
          })
          .catch((error: unknown) =>
            setTransient((prev) =>
              prev.map((t) =>
                t.id === id
                  ? {
                      ...t,
                      status: 'error',
                      error: error instanceof Error ? error.message : undefined,
                    }
                  : t,
              ),
            ),
          )
      }
    }
  }

  const removeFile = (id: string) => {
    const done = labFiles.find((f) => f.path === id)
    if (done) {
      setValue(
        'lab_files',
        labFiles.filter((f) => f.path !== id),
      )
      void removeIntakeFile(draft.intakeId, done.path).catch(() => undefined)
    } else {
      setTransient((prev) => prev.filter((t) => t.id !== id))
    }
  }

  return (
    <AnketaLayout
      step={5}
      title="Nalazi i"
      accent="saglasnost"
      note="Plan podrške ne zamenjuje lekarsku terapiju."
      nextLabel="Pošalji anketu"
      submitting={submitIntake.isPending}
      onSubmit={submit}
    >
      <Question
        name="lab_files"
        label="Krvne slike i izveštaji lekara"
        hint="PDF ili slika, do 10 MB po fajlu. Vidi ih samo Olgica i Ognjen."
      >
        <FileUploadList
          items={items}
          onAdd={addFiles}
          onRemove={removeFile}
          error={errorOf('lab_files')}
          disabled={submitIntake.isPending}
        />
        <p className="mt-3 text-sm text-muted">
          Nalaze ne šaljite WhatsAppom ni mejlom, samo ovde.
        </p>
      </Question>

      <Question name="channels" label="Gde da vam stižu poruke tima?" error={errorOf('channels')}>
        <ChoiceChips
          options={CHANNEL_OPTIONS}
          value={channels}
          onToggle={(v) =>
            setValue(
              'channels',
              channels.includes(v as 'whatsapp')
                ? channels.filter((c) => c !== v)
                : [...channels, v],
            )
          }
        />
      </Question>

      <div className="flex flex-col gap-4 rounded-card bg-card p-5">
        <div data-field="consent_health">
          <Checkbox
            aria-describedby={errorOf('consent_health') ? 'consent-health-error' : undefined}
            {...reg('consent_health')}
          >
            Saglasna/saglasan sam da Olgica i Ognjen vide moje zdravstvene podatke i nalaze, samo
            radi izrade i praćenja mog plana. *
          </Checkbox>
          {errorOf('consent_health') && (
            <p
              id="consent-health-error"
              role="alert"
              className="mt-1 text-sm font-semibold text-danger"
            >
              {errorOf('consent_health')}
            </p>
          )}
        </div>
        <div data-field="consent_terms">
          <Checkbox
            aria-describedby={errorOf('consent_terms') ? 'consent-terms-error' : undefined}
            {...reg('consent_terms')}
          >
            Pročitao/la sam{' '}
            <a
              href="/privatnost"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand-text underline"
            >
              politiku privatnosti
            </a>{' '}
            i{' '}
            <a
              href="/uslovi"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand-text underline"
            >
              uslove korišćenja
            </a>
            . *
          </Checkbox>
          {errorOf('consent_terms') && (
            <p
              id="consent-terms-error"
              role="alert"
              className="mt-1 text-sm font-semibold text-danger"
            >
              {errorOf('consent_terms')}
            </p>
          )}
        </div>
      </div>

      {formError && (
        <p role="alert" className="rounded-card border border-danger p-4 font-semibold text-danger">
          {formError}
        </p>
      )}
    </AnketaLayout>
  )
}
