import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch, type FieldErrors, type Path, type Resolver } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useIntakeDraft } from '@/hooks/useIntakeDraft'
import { stepSchemas, type IntakeDraftValues } from '@/lib/intakeSchema'

export type StepNumber = 1 | 2 | 3 | 4 | 5

/** Početne vrednosti polja koja nisu u nacrtu (država, prefiks telefona, prazne liste). */
const STEP_DEFAULTS: Record<StepNumber, IntakeDraftValues> = {
  1: { country: 'Srbija', phone: '+381 ' },
  2: { symptoms: [], no_diagnoses: false },
  3: {},
  4: { work_exposure: [], disliked_foods: [] },
  5: { channels: ['whatsapp', 'email'], lab_files: [] },
}

/** Fokus na prvo pogrešno polje, po redosledu na ekranu. Polja se prepoznaju po `data-field`. */
export function focusFirstError(errors: FieldErrors<IntakeDraftValues>) {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-field]'))
  const first = nodes.find((node) => node.dataset.field && node.dataset.field in errors)
  if (!first) return
  const target = first.matches('input, textarea, select, button')
    ? first
    : first.querySelector<HTMLElement>('input, textarea, select, button')
  target?.focus()
  target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

/**
 * Forma jednog koraka ankete: validira samo taj korak (Zod iz intakeSchema), čuva nacrt posle svake
 * promene i vodi na sledeći korak. `reg` je `register` koji dodaje `data-field` za fokus na grešku.
 */
export function useStepForm(
  step: StepNumber,
  onValid?: (values: IntakeDraftValues) => Promise<void> | void,
) {
  const navigate = useNavigate()
  const { draft, update, clear } = useIntakeDraft()

  const form = useForm<IntakeDraftValues>({
    resolver: zodResolver(stepSchemas[step - 1]) as unknown as Resolver<IntakeDraftValues>,
    defaultValues: { ...STEP_DEFAULTS[step], ...draft.values },
    shouldFocusError: false,
    reValidateMode: 'onChange',
  })

  // nacrt se čuva posle svake promene
  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => update(values as IntakeDraftValues),
    })
  }, [form, update])

  const submit = form.handleSubmit(
    async (values) => {
      update(values)
      if (onValid) await onValid(values)
      else navigate(`/anketa/${step + 1}`)
    },
    (errors) => focusFirstError(errors),
  )

  const values = useWatch({ control: form.control }) as IntakeDraftValues

  const reg = useMemo(
    () => (name: Path<IntakeDraftValues>) => ({ ...form.register(name), 'data-field': name }),
    [form],
  )

  /** Postavlja vrednost kontrolisanog polja (čipovi, segmenti); ponovo validira posle prvog pokušaja. */
  const setValue = <K extends Path<IntakeDraftValues>>(name: K, value: unknown) =>
    form.setValue(name, value as never, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    })

  const errorOf = (name: string): string | undefined =>
    (form.formState.errors as Record<string, { message?: string } | undefined>)[name]?.message

  return { form, draft, update, clear, submit, reg, setValue, errorOf, values }
}
