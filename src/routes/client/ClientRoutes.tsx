import { Navigate, Route, Routes } from 'react-router-dom'
import { useCurrentProgram, type CurrentProgram } from '@/api/programs'
import { useProfile, useSession, useSignOut } from '@/api/auth'
import { Button } from '@/components/ui'
import DayZero from './DayZero'
import PaymentPending from './PaymentPending'

type Status = CurrentProgram['status']

/** Početni ekran klijenta po statusu programa (PLAN.md 4.1 i 6). */
export function homeForStatus(status: Status): string {
  switch (status) {
    case 'awaiting_payment':
      return '/app/uplata'
    case 'building_plan':
      return '/app/priprema'
    case 'ready':
      return '/app/dan-1'
    case 'active':
      return '/app/danas'
    default:
      return '/app/kraj'
  }
}

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

/** Ekrani koji se prave u kasnijim fazama (Dan 1, Početna, Kraj programa). */
function Soon({ title }: { title: string }) {
  const session = useSession()
  const profile = useProfile(session.data?.user.id)
  const signOut = useSignOut()
  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="mt-2 text-muted">{profile.data?.full_name}, ovaj ekran stiže uskoro.</p>
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
      <Route path="dan-1" element={<Soon title="Dan 1 · prvi koraci" />} />
      <Route path="danas" element={<Soon title="Početna" />} />
      <Route path="kraj" element={<Soon title="Kraj programa" />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
