import type { ComponentType } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import Step1About from './Step1About'
import Step2Health from './Step2Health'
import Step3Habits from './Step3Habits'
import Step4Work from './Step4Work'
import Step5Consent from './Step5Consent'

const steps: Record<string, ComponentType> = {
  '1': Step1About,
  '2': Step2Health,
  '3': Step3Habits,
  '4': Step4Work,
  '5': Step5Consent,
}

/** /anketa/1 … /anketa/5. Nepoznat korak vodi na prvi. */
export default function Anketa() {
  const { step = '' } = useParams()
  const Step = steps[step]
  if (!Step) return <Navigate to="/anketa/1" replace />
  return <Step key={step} />
}
