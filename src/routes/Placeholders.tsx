import { useProfile, useSession, useSignOut } from '@/api/auth'
import { Button } from '@/components/ui'

/** Privremeni ekrani dok se ne naprave pravi (Faze 3, 4 i 8). */
function Placeholder({ title }: { title: string }) {
  const session = useSession()
  const profile = useProfile(session.data?.user.id)
  const signOut = useSignOut()

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="mt-2 text-muted">
        {profile.data?.full_name ?? profile.data?.email} · uloga: {profile.data?.role}
      </p>
      <Button className="mt-6" variant="soft" onClick={() => signOut.mutate()}>
        Odjavi se
      </Button>
    </main>
  )
}

export const ClientHome = () => <Placeholder title="Aplikacija klijenta" />
export const TeamHome = () => <Placeholder title="Konzola tima" />
export const PartnerHome = () => <Placeholder title="Partner panel" />
