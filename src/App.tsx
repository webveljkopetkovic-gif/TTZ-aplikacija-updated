import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

const DevUi = lazy(() => import('@/routes/DevUi'))
const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            {import.meta.env.DEV && <Route path="/dev/ui" element={<DevUi />} />}
            <Route path="*" element={<p className="p-6 font-bold">TTZ – Tvoj tim zdravlja</p>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
