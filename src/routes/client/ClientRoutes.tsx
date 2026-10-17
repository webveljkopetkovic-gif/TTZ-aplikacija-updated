import { Navigate, Route, Routes } from 'react-router-dom'
import { useSession } from '@/api/auth'
import { useCurrentProgram } from '@/api/programs'
import ClientLayout from '@/components/client/ClientLayout'
import { homeForStatus } from '@/lib/programHome'
import DayOne from './DayOne'
import DayZero from './DayZero'
import End from './End'
import Feedback from './Feedback'
import FeedbackForm from './FeedbackForm'
import Home from './Home'
import Journey from './Journey'
import Meals from './Meals'
import PaymentPending from './PaymentPending'
import Progress from './Progress'
import Questions from './Questions'
import Supplements from './Supplements'
import Team from './Team'
import { WorkoutPlayer, Workouts } from './Workouts'

export { homeForStatus }

function ProgramRedirect() {
  const session = useSession()
  const program = useCurrentProgram(session.data?.user.id)

  if (program.isPending)
    return (
      <p role="status" className="p-6 text-muted">
        Učitavanje…
      </p>
    )
  if (program.isError) {
    return (
      <p role="alert" className="p-6 font-bold text-danger">
        Program nije moguće učitati. Osveži stranicu.
      </p>
    )
  }
  if (!program.data) return <Navigate to="/anketa/1" replace />
  return <Navigate to={homeForStatus(program.data.status)} replace />
}

export default function ClientRoutes() {
  return (
    <Routes>
      <Route index element={<ProgramRedirect />} />
      <Route path="uplata" element={<PaymentPending />} />
      <Route path="priprema" element={<DayZero />} />
      <Route path="dan-1" element={<DayOne />} />
      <Route path="kraj" element={<End />} />
      <Route element={<ClientLayout />}>
        <Route path="danas" element={<Home />} />
        <Route path="ishrana" element={<Meals />} />
        <Route path="suplementi" element={<Supplements />} />
        <Route path="vezbe" element={<Workouts />} />
        <Route path="vezbe/:id" element={<WorkoutPlayer />} />
        <Route path="tok" element={<Journey />} />
        <Route path="napredak" element={<Progress />} />
        <Route path="tim" element={<Team />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="feedback/:day" element={<FeedbackForm />} />
        <Route path="pitanja" element={<Questions />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
