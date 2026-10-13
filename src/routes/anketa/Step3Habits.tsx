import { OptionList, Question } from '@/components/form'
import { Input, Segmented } from '@/components/ui'
import { useStepForm } from '@/hooks/useStepForm'
import {
  ACTIVITY_OPTIONS,
  FLUID_OPTIONS,
  LOW_SUN_OPTIONS,
  OUTDOOR_OPTIONS,
  SLEEP_HOURS_OPTIONS,
  STOOL_OPTIONS,
  type Option,
} from '@/lib/intakeSchema'
import { AnketaLayout } from './AnketaLayout'

const segments = (options: readonly Option[]) =>
  options.map((o) => ({ value: o.value, label: o.label }))

export default function Step3Habits() {
  const { submit, reg, setValue, errorOf, values } = useStepForm(3)

  return (
    <AnketaLayout step={3} title="Navike i" accent="san" onSubmit={submit}>
      <Question
        name="fluids"
        label="Koliko tečnosti unosite dnevno?"
        hint="Voda, čaj, supe. Ne računajte kafu i sokove."
        error={errorOf('fluids')}
      >
        <Segmented
          label="Tečnost dnevno"
          value={values.fluids}
          onChange={(v) => setValue('fluids', v)}
          options={segments(FLUID_OPTIONS)}
        />
      </Question>

      <Question
        name="activity"
        label="Kakav vam je nivo fizičke aktivnosti?"
        error={errorOf('activity')}
      >
        <OptionList
          name="activity"
          options={ACTIVITY_OPTIONS}
          value={values.activity}
          onChange={(v) => setValue('activity', v)}
        />
      </Question>

      <Question name="stool" label="Da li imate redovnu stolicu?" error={errorOf('stool')}>
        <OptionList
          name="stool"
          options={STOOL_OPTIONS}
          value={values.stool}
          onChange={(v) => setValue('stool', v)}
        />
      </Question>

      <Input
        label="U koliko sati idete na spavanje?"
        required
        type="time"
        className="w-1/2"
        error={errorOf('bedtime')}
        {...reg('bedtime')}
      />

      <Question name="sleep_hours" label="Koliko okvirno traje san?" error={errorOf('sleep_hours')}>
        <Segmented
          label="Trajanje sna"
          value={values.sleep_hours}
          onChange={(v) => setValue('sleep_hours', v)}
          options={segments(SLEEP_HOURS_OPTIONS)}
        />
      </Question>

      <Question
        name="outdoor_time"
        label="Koliko vremena dnevno provodite napolju?"
        error={errorOf('outdoor_time')}
      >
        <Segmented
          label="Vreme napolju"
          value={values.outdoor_time}
          onChange={(v) => setValue('outdoor_time', v)}
          options={segments(OUTDOOR_OPTIONS)}
        />
      </Question>

      <Question
        name="low_sun_country"
        label="Da li živite u državi u kojoj nema dovoljno sunčanih dana?"
        error={errorOf('low_sun_country')}
      >
        <Segmented
          label="Nedovoljno sunčanih dana"
          value={values.low_sun_country}
          onChange={(v) => setValue('low_sun_country', v)}
          options={segments(LOW_SUN_OPTIONS)}
        />
      </Question>
    </AnketaLayout>
  )
}
