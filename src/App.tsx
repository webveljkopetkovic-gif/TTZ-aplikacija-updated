import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthListener } from '@/api/auth'
import { RequireRole } from '@/components/RequireRole'
import Anketa from '@/routes/anketa/Anketa'
import ForgotPassword from '@/routes/ForgotPassword'
import { Privacy, Terms } from '@/routes/Legal'
import Login from '@/routes/Login'
import ClientRoutes from '@/routes/client/ClientRoutes'
import Landing from '@/routes/Landing'
import PlanChoice from '@/routes/PlanChoice'
import { PartnerHome, TeamHome } from '@/routes/Placeholders'
import TeamPayments from '@/routes/tim/TeamPayments'
import ResetPassword from '@/routes/ResetPassword'

const DevUi = lazy(() => import('@/routes/DevUi'))
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function AppRoutes() {
  useAuthListener()
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/plan" element={<PlanChoice />} />
        <Route path="/anketa" element={<Navigate to="/anketa/1" replace />} />
        <Route path="/anketa/:step" element={<Anketa />} />
        <Route path="/privatnost" element={<Privacy />} />
        <Route path="/uslovi" element={<Terms />} />
        <Route path="/prijava" element={<Login />} />
        <Route path="/zaboravljena-lozinka" element={<ForgotPassword />} />
        <Route path="/nova-lozinka" element={<ResetPassword />} />
        <Route
          path="/app/*"
          element={
            <RequireRole allow={['client']}>
              <ClientRoutes />
            </RequireRole>
          }
        />
        <Route
          path="/tim/uplate"
          element={
            <RequireRole allow={['admin']}>
              <TeamPayments />
            </RequireRole>
          }
        />
        <Route
          path="/tim/*"
          element={
            <RequireRole allow={['nutritionist', 'trainer', 'admin']}>
              <TeamHome />
            </RequireRole>
          }
        />
        <Route
          path="/partner/*"
          element={
            <RequireRole allow={['partner', 'admin']}>
              <PartnerHome />
            </RequireRole>
          }
        />
        {import.meta.env.DEV && <Route path="/dev/ui" element={<DevUi />} />}
        <Route path="*" element={<p className="p-6 font-bold">Stranica ne postoji.</p>} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
