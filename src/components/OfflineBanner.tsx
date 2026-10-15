import { useEffect, useState } from 'react'

/** Traka kad nema interneta: aplikacija se otvara iz keša, ali podaci i slanje traže vezu. */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (online) return null
  return (
    <p
      role="status"
      className="sticky top-0 z-50 bg-ink px-4 py-2 text-center text-sm font-bold text-white"
    >
      Nema interneta. Podaci i slanje rade kad se veza vrati.
    </p>
  )
}
