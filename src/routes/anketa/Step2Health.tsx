import { ChoiceChip } from '@/components/ui'
import { ChoiceChips, Question, TextArea, YesNoWithText } from '@/components/form'
import { Segmented } from '@/components/ui'
import { useStepForm } from '@/hooks/useStepForm'
import { PREGNANCY_OPTIONS, SYMPTOM_OPTIONS, TONSILLITIS_OPTIONS } from '@/lib/intakeSchema'
import { AnketaLayout } from './AnketaLayout'

export default function Step2Health() {
  const { submit, reg, setValue, errorOf, values } = useStepForm(2)
  const symptoms: string[] = values.symptoms ?? []

  return (
    <AnketaLayout step={2} title="Vaše" accent="zdravlje" onSubmit={submit}>
      <div className="flex flex-col gap-3">
        <TextArea
          label="Koje dijagnoze imate? Navedite sve."
          disabled={values.no_diagnoses}
          error={errorOf('diagnoses')}
          {...reg('diagnoses')}
        />
        <div>
          <ChoiceChip
            selected={!!values.no_diagnoses}
            onClick={() => setValue('no_diagnoses', !values.no_diagnoses)}
          >
            Nemam dijagnoza
          </ChoiceChip>
        </div>
      </div>

      <Question
        name="symptoms"
        label="Problemi sa zdravljem i simptomi"
        hint="Označite sve kojih se setite."
      >
        <ChoiceChips
          options={SYMPTOM_OPTIONS}
          value={symptoms}
          onToggle={(v) =>
            setValue(
              'symptoms',
              symptoms.includes(v) ? symptoms.filter((s) => s !== v) : [...symptoms, v],
            )
          }
        />
      </Question>

      <TextArea
        label="Još neki simptom?"
        placeholder="Opišite svojim rečima"
        error={errorOf('symptoms_other')}
        {...reg('symptoms_other')}
      />

      <YesNoWithText
        name="allergies"
        label="Da li imate neke alergije na hranu ili lekove?"
        value={values.allergies}
        onChange={(v) => setValue('allergies', v)}
        textLabel="Koje?"
        textValue={values.allergies_text ?? ''}
        onTextChange={(v) => setValue('allergies_text', v)}
        error={errorOf('allergies')}
        textError={errorOf('allergies_text')}
      />

      <TextArea
        label="Šta ste do sad koristili od terapije?"
        placeholder="Lekovi, suplementi, ranije terapije"
        error={errorOf('therapy_past')}
        {...reg('therapy_past')}
      />

      <TextArea
        label="Šta koristite trenutno?"
        placeholder="Naziv i kako uzimate"
        error={errorOf('therapy_current')}
        {...reg('therapy_current')}
      />

      <YesNoWithText
        name="surgery"
        label="Da li ste imali neku operaciju?"
        value={values.surgery}
        onChange={(v) => setValue('surgery', v)}
        textLabel="Koju i kada"
        textValue={values.surgery_text ?? ''}
        onTextChange={(v) => setValue('surgery_text', v)}
        error={errorOf('surgery')}
        textError={errorOf('surgery_text')}
      />

      <Question
        name="childhood_tonsillitis"
        label="Da li ste kao dete imali česte upale grla i gnojne angine?"
        error={errorOf('childhood_tonsillitis')}
      >
        <Segmented
          label="Česte upale grla i gnojne angine u detinjstvu"
          value={values.childhood_tonsillitis}
          onChange={(v) => setValue('childhood_tonsillitis', v)}
          options={TONSILLITIS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </Question>

      {values.sex === 'female' && (
        <Question
          name="pregnancies"
          label="Broj trudnoća do sad"
          hint="Prikazuje se samo ako ste izabrali „Žena“."
          error={errorOf('pregnancies')}
        >
          <Segmented
            label="Broj trudnoća"
            value={values.pregnancies}
            onChange={(v) => setValue('pregnancies', v)}
            options={PREGNANCY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </Question>
      )}
    </AnketaLayout>
  )
}
