import * as Sentry from '@sentry/react'

/**
 * Prijava grešaka (Sentry). Radi samo kad je postavljen VITE_SENTRY_DSN. Zdravstveni podaci ne smeju u izveštaje:
 * bez ličnih podataka, bez snimaka ekrana, a tekst iz URL-a i formi se ne šalje.
 */
export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    integrations: (defaults) => defaults.filter((i) => i.name !== 'Breadcrumbs'),
    beforeSend(event) {
      delete event.user
      delete event.request?.cookies
      delete event.request?.headers
      delete event.request?.query_string
      return event
    },
  })
}

export { Sentry }
