import { ChoiceQuestion, TextArea } from '@/components/form'
import { useStepForm } from '@/hooks/useStepForm'
import { YES_NO_OPTIONS, YES_NO_UNSURE_OPTIONS, needsDoctorNotice } from '@/lib/trainingSchema'
import { AnketaLayout } from './AnketaLayout'

export default function Step6Safety() {
  const { submit, reg, setValue, errorOf, values } = useStepForm(6)

  return (
    <AnketaLayout step={6} title="Zdravlje i" accent="bezbednost" onSubmit={submit}>
      <ChoiceQuestion
        name="doctor_limit"
        label="Da li vam je lekar rekao da ograničite fizičku aktivnost?"
        options={YES_NO_UNSURE_OPTIONS}
        value={values.doctor_limit}
        onChange={(v) => setValue('doctor_limit', v)}
        error={errorOf('doctor_limit')}
      />
      {values.doctor_limit === 'yes' && (
        <TextArea
          label="Navedite razlog"
          rows={2}
          error={errorOf('doctor_limit_reason')}
          {...reg('doctor_limit_reason')}
        />
      )}

      <ChoiceQuestion
        name="chest_pain"
        label="Da li ste tokom aktivnosti imali bol u grudima, nesvesticu ili neuobičajeno izraženo gušenje?"
        options={YES_NO_OPTIONS}
        value={values.chest_pain}
        onChange={(v) => setValue('chest_pain', v)}
        error={errorOf('chest_pain')}
      />

      <ChoiceQuestion
        name="injury"
        label="Da li trenutno imate povredu ili bol koji utiče na vežbanje?"
        options={YES_NO_OPTIONS}
        value={values.injury}
        onChange={(v) => setValue('injury', v)}
        error={errorOf('injury')}
      />

      <ChoiceQuestion
        name="medical_restriction"
        label="Da li imate medicinsko ograničenje za određene vežbe?"
        options={YES_NO_UNSURE_OPTIONS}
        value={values.medical_restriction}
        onChange={(v) => setValue('medical_restriction', v)}
        error={errorOf('medical_restriction')}
      />
      {values.medical_restriction === 'yes' && (
        <TextArea
          label="Ako postoji ograničenje, ukratko ga opišite"
          rows={2}
          error={errorOf('restriction_text')}
          {...reg('restriction_text')}
        />
      )}

      {needsDoctorNotice(values) && (
        <p role="note" className="rounded-card border border-line bg-card p-5 font-semibold">
          Pre početka vežbanja se javi svom lekaru. Možeš da nastaviš anketu, a Ognjen će pogledati
          ove odgovore pre nego što napravi plan.
        </p>
      )}
    </AnketaLayout>
  )
}
