import { ChoiceChips, Question, TextArea } from '@/components/form'
import { useStepForm } from '@/hooks/useStepForm'
import {
  DISLIKED_FOOD_OPTIONS,
  toggleWorkExposure,
  WORK_EXPOSURE_OPTIONS,
} from '@/lib/intakeSchema'
import { AnketaLayout } from './AnketaLayout'

export default function Step4Work() {
  const { submit, reg, setValue, errorOf, values } = useStepForm(4)
  const exposure: string[] = values.work_exposure ?? []
  const disliked: string[] = values.disliked_foods ?? []

  return (
    <AnketaLayout step={4} title="Posao i" accent="ishrana" onSubmit={submit}>
      <Question
        name="work_exposure"
        label="Da li ste na poslu izloženi nečemu od ovoga?"
        hint="Označite sve što važi."
        error={errorOf('work_exposure')}
      >
        <ChoiceChips
          options={WORK_EXPOSURE_OPTIONS}
          value={exposure}
          onToggle={(v) => setValue('work_exposure', toggleWorkExposure(exposure, v))}
        />
      </Question>

      <TextArea
        label="Nešto drugo vezano za posao?"
        placeholder="Npr. puno putovanja, rad za računarom do kasno"
        error={errorOf('work_other')}
        {...reg('work_other')}
      />

      <Question
        name="disliked_foods"
        label="Hrana koju izrazito ne volite"
        hint="Ovo nikad neće biti u vašem planu."
        error={errorOf('disliked_foods')}
      >
        <ChoiceChips
          options={DISLIKED_FOOD_OPTIONS}
          value={disliked}
          onToggle={(v) =>
            setValue(
              'disliked_foods',
              disliked.includes(v) ? disliked.filter((f) => f !== v) : [...disliked, v],
            )
          }
        />
      </Question>

      <TextArea
        label="Još nešto što ne volite?"
        placeholder="Upišite"
        rows={2}
        error={errorOf('disliked_other')}
        {...reg('disliked_other')}
      />

      <TextArea
        label="Napomena: nešto što je od značaja, a nisam pitala"
        placeholder="Sve što mislite da je bitno za vaš plan"
        rows={5}
        maxLength={2000}
        error={errorOf('notes')}
        {...reg('notes')}
      />
    </AnketaLayout>
  )
}
