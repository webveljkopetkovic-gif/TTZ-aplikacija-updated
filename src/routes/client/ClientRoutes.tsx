import { Navigate, Route, Routes } from 'react-router-dom'
import { useProfile, useSession, useSignOut } from '@/api/auth'
import { useCurrentProgram } from '@/api/programs'
import ClientLayout from '@/components/client/ClientLayout'
import { ComingSoon } from '@/components/client/ui'
import { Button } from '@/components/ui'
import { homeForStatus } from '@/lib/programHome'
import DayOne from './DayOne'
import DayZero from './DayZero'
import Home from './Home'
import Journey from './Journey'
import Meals from './Meals'
import PaymentPending from './PaymentPending'
import Progress from './Progress'
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

/** Kraj programa stiže u Fazi 7. */
function EndOfProgram() {
  const session = useSession()
  const profile = useProfile(session.data?.user.id)
  const signOut = useSignOut()
  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-3xl font-extrabold">Kraj programa</h1>
      <p className="mt-2 text-muted">{profile.data?.full_name}, ovaj ekran stiže u Fazi 7.</p>
      <Button className="mt-6" variant="soft" onClick={() => signOut.mutate()}>
        Odjavi se
      </Button>
    </main>
  )
}

export default function ClientRoutes() {
  return (
    <Routes>
      <Route index element={<ProgramRedirect />} />
      <Route path="uplata" element={<PaymentPending />} />
      <Route path="priprema" element={<DayZero />} />
      <Route path="dan-1" element={<DayOne />} />
      <Route path="kraj" element={<EndOfProgram />} />
      <Route element={<ClientLayout />}>
        <Route path="danas" element={<Home />} />
        <Route path="ishrana" element={<Meals />} />
        <Route path="suplementi" element={<Supplements />} />
        <Route path="vezbe" element={<Workouts />} />
        <Route path="vezbe/:id" element={<WorkoutPlayer />} />
        <Route path="tok" element={<Journey />} />
        <Route path="napredak" element={<Progress />} />
        <Route path="tim" element={<Team />} />
        <Route path="feedback/*" element={<ComingSoon title="Feedback" phase={5} />} />
        <Route path="pitanja" element={<ComingSoon title="Pitanja" phase={6} />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
