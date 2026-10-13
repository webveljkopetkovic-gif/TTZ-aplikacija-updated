import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useProfile, useSession } from '@/api/auth'
import { homeForRole, type UserRole } from '@/lib/roles'

/** Čuva rutu: neprijavljen ide na /prijava, pogrešna uloga na svoj početni ekran. */
export function RequireRole({ allow, children }: { allow: UserRole[]; children: ReactNode }) {
  const location = useLocation()
  const session = useSession()
  const profile = useProfile(session.data?.user.id)

  if (session.isPending) return <Loading />
  if (!session.data) return <Navigate to="/prijava" replace state={{ from: location.pathname }} />
  if (profile.isPending) return <Loading />
  if (profile.isError || !profile.data) {
    return (
      <p role="alert" className="p-6 font-bold text-danger">
        Nalog nije moguće učitati. Pokušaj ponovo da se prijaviš.
      </p>
    )
  }
  if (!allow.includes(profile.data.role)) {
    return <Navigate to={homeForRole(profile.data.role)} replace />
  }
  return <>{children}</>
}

function Loading() {
  return (
    <p role="status" className="p-6 text-muted">
      Učitavanje…
    </p>
  )
}
