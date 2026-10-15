import { Navigate, Route, Routes } from 'react-router-dom'
import TeamLayout from '@/components/team/TeamLayout'
import { Page } from '@/components/team/ui'
import TeamClients from './TeamClients'
import TeamDossier from './TeamDossier'
import TeamMaterials from './TeamMaterials'
import TeamOverview from './TeamOverview'
import TeamPayments from './TeamPayments'
import TeamPlan from './TeamPlan'
import { RequireRole } from '@/components/RequireRole'

/** Ekrani koji se prave u kasnijim fazama (feedback: Faza 5, pitanja: Faza 6). */
function Soon({ title, phase }: { title: string; phase: number }) {
  return (
    <Page>
      <h1 className="text-4xl font-extrabold">{title}</h1>
      <p className="mt-2 text-muted">Ovaj ekran stiže u Fazi {phase}.</p>
    </Page>
  )
}

/** Konzola tima (/tim/*): Pregled, Dosijei, Zdravstveni dosije, Plan za klijenta, Materijali. */
export default function TeamRoutes() {
  return (
    <Routes>
      <Route element={<TeamLayout />}>
        <Route index element={<TeamOverview />} />
        <Route path="klijenti" element={<TeamClients />} />
        <Route path="klijenti/:id" element={<TeamDossier />} />
        <Route path="klijenti/:id/plan" element={<TeamPlan />} />
        <Route path="materijali" element={<TeamMaterials />} />
        <Route path="feedback/*" element={<Soon title="Feedback" phase={5} />} />
        <Route path="pitanja" element={<Soon title="Pitanja" phase={6} />} />
        <Route
          path="uplate"
          element={
            <RequireRole allow={['admin']}>
              <TeamPayments />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/tim" replace />} />
      </Route>
    </Routes>
  )
}
