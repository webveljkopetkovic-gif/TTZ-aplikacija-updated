import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initMonitoring, Sentry } from './lib/monitoring'
import './styles/index.css'

initMonitoring()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <p role="alert" className="p-6 font-bold">
          Nešto je pošlo naopako. Osveži stranicu; ako se ponovi, javi timu.
        </p>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
