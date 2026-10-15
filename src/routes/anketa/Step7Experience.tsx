import { ChoiceQuestion } from '@/components/form'
import { useStepForm } from '@/hooks/useStepForm'
import {
  TECHNIQUE_OPTIONS,
  TRAIN_DURATION_OPTIONS,
  TRAIN_FREQUENCY_OPTIONS,
  YES_NO_OPTIONS,
} from '@/lib/trainingSchema'
import { AnketaLayout } from './AnketaLayout'

export default function Step7Experience() {
  const { submit, setValue, errorOf, values } = useStepForm(7)

  return (
    <AnketaLayout step={7} title="Trenažno" accent="iskustvo" onSubmit={submit}>
      <ChoiceQuestion
        list
        name="train_duration"
        label="Koliko dugo redovno trenirate?"
        options={TRAIN_DURATION_OPTIONS}
        value={values.train_duration}
        onChange={(v) => setValue('train_duration', v)}
        error={errorOf('train_duration')}
      />
      <ChoiceQuestion
        list
        name="train_frequency"
        label="Učestalost treninga tokom poslednja 3 meseca"
        options={TRAIN_FREQUENCY_OPTIONS}
        value={values.train_frequency}
        onChange={(v) => setValue('train_frequency', v)}
        error={errorOf('train_frequency')}
      />
      <ChoiceQuestion
        list
        name="technique"
        label="Poznavanje tehnike osnovnih vežbi"
        options={TECHNIQUE_OPTIONS}
        value={values.technique}
        onChange={(v) => setValue('technique', v)}
        error={errorOf('technique')}
      />
      <ChoiceQuestion
        name="long_break"
        label="Pauza duža od 3 meseca u poslednjih godinu dana?"
        options={YES_NO_OPTIONS}
        value={values.long_break}
        onChange={(v) => setValue('long_break', v)}
        error={errorOf('long_break')}
      />
    </AnketaLayout>
  )
}
