import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthListener } from '@/api/auth'
import { RequireRole } from '@/components/RequireRole'
import ForgotPassword from '@/routes/ForgotPassword'
import Login from '@/routes/Login'
import { ClientHome, PartnerHome, TeamHome } from '@/routes/Placeholders'
import ResetPassword from '@/routes/ResetPassword'

const DevUi = lazy(() => import('@/routes/DevUi'))
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function AppRoutes() {
  useAuthListener()
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Navigate to="/prijava" replace />} />
        <Route path="/prijava" element={<Login />} />
        <Route path="/zaboravljena-lozinka" element={<ForgotPassword />} />
        <Route path="/nova-lozinka" element={<ResetPassword />} />
        <Route
          path="/app/*"
          element={
            <RequireRole allow={['client']}>
              <ClientHome />
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
