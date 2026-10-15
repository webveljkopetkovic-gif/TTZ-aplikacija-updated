import { ChoiceQuestion } from '@/components/form'
import { useStepForm } from '@/hooks/useStepForm'
import {
  CHAIR_STAND_OPTIONS,
  MOVEMENT_PAIN_OPTIONS,
  PLANK_OPTIONS,
  PUSHUP_OPTIONS,
  SINGLE_LEG_OPTIONS,
} from '@/lib/trainingSchema'
import { AnketaLayout } from './AnketaLayout'

export default function Step8Motor() {
  const { submit, setValue, errorOf, values } = useStepForm(8)

  return (
    <AnketaLayout step={8} title="Test motoričkih" accent="sposobnosti" onSubmit={submit}>
      <ChoiceQuestion
        name="chair_stands"
        label="Broj sedanja i ustajanja sa kuhinjske stolice"
        options={CHAIR_STAND_OPTIONS}
        value={values.chair_stands}
        onChange={(v) => setValue('chair_stands', v)}
        error={errorOf('chair_stands')}
      />
      <ChoiceQuestion
        list
        name="pushups_knees"
        label="Broj sklekova sa osloncem na kolena i ruke"
        options={PUSHUP_OPTIONS}
        value={values.pushups_knees}
        onChange={(v) => setValue('pushups_knees', v)}
        error={errorOf('pushups_knees')}
      />
      <ChoiceQuestion
        list
        name="pushups_feet"
        label="Broj sklekova sa osloncem na stopala i ruke"
        options={PUSHUP_OPTIONS}
        value={values.pushups_feet}
        onChange={(v) => setValue('pushups_feet', v)}
        error={errorOf('pushups_feet')}
      />
      <ChoiceQuestion
        list
        name="plank_knees"
        label="Plank (izdržaj na podlakticama) sa osloncem na kolena i laktove"
        options={PLANK_OPTIONS}
        value={values.plank_knees}
        onChange={(v) => setValue('plank_knees', v)}
        error={errorOf('plank_knees')}
      />
      <ChoiceQuestion
        list
        name="plank_feet"
        label="Plank (izdržaj na podlakticama) sa osloncem na stopala i laktove"
        options={PLANK_OPTIONS}
        value={values.plank_feet}
        onChange={(v) => setValue('plank_feet', v)}
        error={errorOf('plank_feet')}
      />
      <ChoiceQuestion
        list
        name="single_leg"
        label="Stajanje na jednoj nozi 30 sekundi"
        options={SINGLE_LEG_OPTIONS}
        value={values.single_leg}
        onChange={(v) => setValue('single_leg', v)}
        error={errorOf('single_leg')}
      />
      <ChoiceQuestion
        name="movement_pain"
        label="Bol ili gubitak kontrole tokom čučnja, iskoraka ili skleka"
        options={MOVEMENT_PAIN_OPTIONS}
        value={values.movement_pain}
        onChange={(v) => setValue('movement_pain', v)}
        error={errorOf('movement_pain')}
      />
    </AnketaLayout>
  )
}
