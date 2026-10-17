import { Navigate, Route, Routes } from 'react-router-dom'
import TeamLayout from '@/components/team/TeamLayout'
import TeamClients from './TeamClients'
import TeamDossier from './TeamDossier'
import TeamFeedback from './TeamFeedback'
import TeamMaterials from './TeamMaterials'
import TeamNotifications from './TeamNotifications'
import TeamOverview from './TeamOverview'
import TeamPayments from './TeamPayments'
import TeamPlan from './TeamPlan'
import TeamQuestions from './TeamQuestions'
import TeamReport from './TeamReport'
import { RequireRole } from '@/components/RequireRole'

/** Konzola tima (/tim/*): Pregled, Klijenti, Karton klijenta, Plan za klijenta, Feedback, Pitanja, Obaveštenja, Materijali. */
export default function TeamRoutes() {
  return (
    <Routes>
      <Route element={<TeamLayout />}>
        <Route index element={<TeamOverview />} />
        <Route path="klijenti" element={<TeamClients />} />
        <Route path="klijenti/:id" element={<TeamDossier />} />
        <Route path="klijenti/:id/plan" element={<TeamPlan />} />
        <Route path="klijenti/:id/izvestaj" element={<TeamReport />} />
        <Route path="materijali" element={<TeamMaterials />} />
        <Route path="feedback" element={<TeamFeedback />} />
        <Route path="feedback/:id" element={<TeamFeedback />} />
        <Route path="obavestenja" element={<TeamNotifications />} />
        <Route path="pitanja" element={<TeamQuestions />} />
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
