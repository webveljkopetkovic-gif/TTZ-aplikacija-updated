import { CountrySelect, Question } from '@/components/form'
import { Input, Segmented } from '@/components/ui'
import { useStepForm } from '@/hooks/useStepForm'
import { SEX_OPTIONS, todayInBelgrade } from '@/lib/intakeSchema'
import { AnketaLayout } from './AnketaLayout'

export default function Step1About() {
  const { submit, reg, setValue, errorOf, values } = useStepForm(1)

  const today = todayInBelgrade()
  const oldest = `${Number(today.slice(0, 4)) - 100}${today.slice(4)}`

  return (
    <AnketaLayout
      step={1}
      title="Za početak,"
      accent="o vama"
      note="Program je za osobe starije od 18 godina."
      onSubmit={submit}
    >
      <Input
        label="Ime i prezime"
        required
        autoComplete="name"
        error={errorOf('full_name')}
        {...reg('full_name')}
      />

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            required
            type="email"
            autoComplete="email"
            inputMode="email"
            error={errorOf('email')}
            {...reg('email')}
          />
          <Input
            label="Telefon (WhatsApp)"
            required
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            error={errorOf('phone')}
            {...reg('phone')}
          />
        </div>
        <p className="text-sm text-muted">
          Telefon nam treba za WhatsApp poruke od tima. Ne zovemo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Datum rođenja"
          required
          type="date"
          min={oldest}
          max={today}
          autoComplete="bday"
          error={errorOf('birth_date')}
          {...reg('birth_date')}
        />
        <Input
          label="Zanimanje"
          required
          autoComplete="organization-title"
          error={errorOf('occupation')}
          {...reg('occupation')}
        />
      </div>

      <Question name="sex" label="Pol" error={errorOf('sex')}>
        <Segmented
          label="Pol"
          value={values.sex}
          onChange={(v) => setValue('sex', v)}
          options={SEX_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </Question>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Telesna visina (cm)"
          required
          inputMode="decimal"
          error={errorOf('height_cm')}
          {...reg('height_cm')}
        />
        <Input
          label="Težina (kg)"
          required
          inputMode="decimal"
          error={errorOf('weight_kg')}
          {...reg('weight_kg')}
        />
      </div>

      <CountrySelect
        label="Država u kojoj živite"
        required
        error={errorOf('country')}
        {...reg('country')}
      />
    </AnketaLayout>
  )
}
