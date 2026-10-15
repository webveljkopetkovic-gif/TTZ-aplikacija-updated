import type { ComponentType } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import Step1About from './Step1About'
import Step2Health from './Step2Health'
import Step3Habits from './Step3Habits'
import Step4Work from './Step4Work'
import Step5Training from './Step5Training'
import Step6Safety from './Step6Safety'
import Step7Experience from './Step7Experience'
import Step8Motor from './Step8Motor'
import Step9Fitness from './Step9Fitness'
import Step10Consent from './Step10Consent'

const steps: Record<string, ComponentType> = {
  '1': Step1About,
  '2': Step2Health,
  '3': Step3Habits,
  '4': Step4Work,
  '5': Step5Training,
  '6': Step6Safety,
  '7': Step7Experience,
  '8': Step8Motor,
  '9': Step9Fitness,
  '10': Step10Consent,
}

/** /anketa/1 … /anketa/10. Nepoznat korak vodi na prvi. */
export default function Anketa() {
  const { step = '' } = useParams()
  const Step = steps[step]
  if (!Step) return <Navigate to="/anketa/1" replace />
  return <Step key={step} />
}
