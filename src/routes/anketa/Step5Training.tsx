import { ChoiceChips, ChoiceQuestion, Question } from '@/components/form'
import { useStepForm } from '@/hooks/useStepForm'
import { GOAL_OPTIONS, PLACE_OPTIONS } from '@/lib/trainingSchema'
import { AnketaLayout } from './AnketaLayout'

export default function Step5Training() {
  const { submit, setValue, errorOf, values } = useStepForm(5)
  const goals: string[] = values.goals ?? []

  return (
    <AnketaLayout
      step={5}
      title="Vežbanje:"
      accent="cilj i mesto"
      note="Ognjenov deo ankete služi za preliminarnu procenu. Konačan nivo potvrđuje trener."
      onSubmit={submit}
    >
      <Question
        name="goals"
        label="Primarni cilj"
        hint="Možete označiti više odgovora."
        error={errorOf('goals')}
      >
        <ChoiceChips
          options={GOAL_OPTIONS}
          value={goals}
          onToggle={(v) =>
            setValue('goals', goals.includes(v) ? goals.filter((g) => g !== v) : [...goals, v])
          }
        />
      </Question>

      <ChoiceQuestion
        name="place"
        label="Mesto treninga"
        options={PLACE_OPTIONS}
        value={values.place}
        onChange={(v) => setValue('place', v)}
        error={errorOf('place')}
      />
    </AnketaLayout>
  )
}
