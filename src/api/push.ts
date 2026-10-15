import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { pushSupported, urlBase64ToBytes } from '@/lib/install'
import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushState = 'unsupported' | 'unconfigured' | 'denied' | 'off' | 'on'

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

/** Stanje obaveštenja na ovom uređaju. */
export function usePushState() {
  return useQuery({
    queryKey: ['push-state'],
    queryFn: async (): Promise<PushState> => {
      if (!pushSupported()) return 'unsupported'
      if (!VAPID_PUBLIC_KEY) return 'unconfigured'
      if (Notification.permission === 'denied') return 'denied'
      return (await currentSubscription()) ? 'on' : 'off'
    },
  })
}

export function useEnablePush(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!userId || !VAPID_PUBLIC_KEY) throw new Error('Obaveštenja nisu podešena.')
      if ((await Notification.requestPermission()) !== 'granted') {
        throw new Error('Obaveštenja su isključena u podešavanjima pregledača.')
      }
      const reg = await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToBytes(VAPID_PUBLIC_KEY) as BufferSource,
        }))
      const json = sub.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? '',
          auth: json.keys?.auth ?? '',
          user_agent: navigator.userAgent.slice(0, 200),
        },
        { onConflict: 'endpoint' },
      )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['push-state'] }),
  })
}

export function useDisablePush() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const sub = await currentSubscription()
      if (!sub) return
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['push-state'] }),
  })
}
