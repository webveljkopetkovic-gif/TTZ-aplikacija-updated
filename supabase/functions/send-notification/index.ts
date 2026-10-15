// Šalje poruke iz reda notifications (WhatsApp template-i + email). Poziva ga scheduler/cron (service role)
// ili tim sa ekrana „Obaveštenja“ (retry_id: neuspela poruka ide ponovo u red).
import { z } from 'zod'
import { adminClient, callerOf, HttpError, isServiceCall, json, serve, TEAM_ROLES } from '../_shared/http.ts'
import { dispatchQueued } from '../_shared/notify.ts'

const body = z.object({ retry_id: z.guid().optional() })

serve(async (req, raw) => {
  const parsed = body.safeParse(raw ?? {})
  if (!parsed.success) throw new HttpError('Neispravan zahtev', 400)
  const admin = adminClient()

  if (!isServiceCall(req)) {
    const caller = await callerOf(admin, req)
    if (!caller) throw new HttpError('Potrebna je prijava', 401)
    if (!TEAM_ROLES.includes(caller.role)) throw new HttpError('Poruke šalje samo tim', 403)
  }

  if (parsed.data.retry_id) {
    const { data, error } = await admin
      .from('notifications')
      .update({ status: 'queued', attempts: 0, error: null, scheduled_for: new Date().toISOString() })
      .eq('id', parsed.data.retry_id)
      .eq('status', 'failed')
      .select('id')
    if (error) throw error
    if (!data?.length) throw new HttpError('Poruka nije u statusu „neuspela“', 409)
  }

  return json(await dispatchQueued(admin))
})
