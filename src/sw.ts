/// Service worker (vite-plugin-pwa, injectManifest): keš aplikacije za offline + web push podsetnici.
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

type PushEventLike = Event & {
  data: { json(): unknown } | null
  waitUntil(p: Promise<unknown>): void
}
type ClickEventLike = Event & {
  notification: { close(): void; data?: { url?: string } }
  waitUntil(p: Promise<unknown>): void
}
declare global {
  interface Window {
    __WB_MANIFEST: Array<string | { url: string; revision: string | null }>
  }
}

type WorkerScope = {
  registration: {
    showNotification(title: string, options: Record<string, unknown>): Promise<void>
  }
  clients: {
    matchAll(o: {
      type: 'window'
      includeUncontrolled: boolean
    }): Promise<
      Array<{ url: string; focus(): Promise<unknown>; navigate?(u: string): Promise<unknown> }>
    >
    openWindow(url: string): Promise<unknown>
  }
  location: { origin: string }
  skipWaiting(): void
  addEventListener(type: string, fn: (e: never) => void): void
}
const sw = self as unknown as WorkerScope

sw.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
// SPA: svaka navigacija (osim API-ja) dobija keširan index.html, pa se aplikacija otvara i bez mreže
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/functions\//] }),
)

type PushPayload = { title?: string; body?: string; url?: string }

sw.addEventListener('push', (event: PushEventLike) => {
  let data: PushPayload = {}
  try {
    data = (event.data?.json() as PushPayload) ?? {}
  } catch {
    // poruka bez sadržaja: prikaži opšte obaveštenje
  }
  event.waitUntil(
    sw.registration.showNotification(data.title ?? 'TTZ – Tvoj tim zdravlja', {
      body: data.body ?? 'Imaš novu poruku od tima.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url ?? '/app' },
    }),
  )
})

sw.addEventListener('notificationclick', (event: ClickEventLike) => {
  event.notification.close()
  const target = event.notification.data?.url || '/app'
  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const open = wins[0]
      if (open) return open.focus().then(() => open.navigate?.(target))
      return sw.clients.openWindow(target)
    }),
  )
})
