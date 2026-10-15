import { ChoiceQuestion } from '@/components/form'
import { useStepForm } from '@/hooks/useStepForm'
import {
  CARDIO_OPTIONS,
  HOME_EQUIPMENT,
  RECOVERY_OPTIONS,
  STAIRS_OPTIONS,
} from '@/lib/trainingSchema'
import { AnketaLayout } from './AnketaLayout'

export default function Step9Fitness() {
  const { submit, setValue, errorOf, values } = useStepForm(9)

  return (
    <AnketaLayout step={9} title="Kondicija i" accent="oporavak" onSubmit={submit}>
      <ChoiceQuestion
        list
        name="stairs"
        label="Penjanje uz stepenice na 3–4 sprata"
        options={STAIRS_OPTIONS}
        value={values.stairs}
        onChange={(v) => setValue('stairs', v)}
        error={errorOf('stairs')}
      />
      <ChoiceQuestion
        list
        name="cardio_duration"
        label="Trajanje brzog hodanja ili lagane aerobne aktivnosti"
        options={CARDIO_OPTIONS}
        value={values.cardio_duration}
        onChange={(v) => setValue('cardio_duration', v)}
        error={errorOf('cardio_duration')}
      />
      <ChoiceQuestion
        list
        name="recovery"
        label="Oporavak nakon zahtevnog treninga"
        options={RECOVERY_OPTIONS}
        value={values.recovery}
        onChange={(v) => setValue('recovery', v)}
        error={errorOf('recovery')}
      />

      <div className="rounded-card-lg bg-card p-6">
        <h2 className="text-lg font-extrabold">Oprema i organizacija</h2>
        {values.place === 'gym' ? (
          <p className="mt-2 text-muted">Ukoliko se vežba u teretani: sva oprema je u teretani.</p>
        ) : (
          <>
            <p className="mt-2 text-muted">Ukoliko se vežba kod kuće, potrebno je nabaviti:</p>
            <ul className="mt-3 list-disc pl-5">
              {HOME_EQUIPMENT.map((item) => (
                <li key={item} className="py-0.5">
                  {item}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </AnketaLayout>
  )
}
