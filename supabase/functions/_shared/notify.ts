/**
 * Obaveštenja (PLAN.md 4.5): sve poruke prolaze kroz tabelu `notifications` sa `dedupe_key`, nikad direktno.
 * `enqueue` upisuje redove, `dispatchQueued` ih šalje: WhatsApp Cloud API (odobreni template-i) i Resend email.
 * Retry 3 puta sa pauzom, pa fallback na email ako WhatsApp ne uspe. Tim ne zove klijente: samo poruke.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export type Kind =
  | 'plan_ready'
  | 'feedback_due'
  | 'feedback_reminder'
  | 'team_reply'
  | 'program_end'
  | 'report_ready'
export type Channel = 'whatsapp' | 'email' | 'app'

export const MAX_ATTEMPTS = 3
export const RETRY_DELAY_MIN = 5

/** Odobreni WhatsApp template-i (Meta Business Manager). */
export const TEMPLATE: Record<Kind, string> = {
  plan_ready: 'ttz_plan_ready',
  feedback_due: 'ttz_feedback_due',
  feedback_reminder: 'ttz_feedback_reminder',
  team_reply: 'ttz_team_reply',
  program_end: 'ttz_program_ending',
  report_ready: 'ttz_report_ready',
}

export type MessageContext = { name: string; appUrl: string }
export type Built = { subject: string; text: string; params: string[] }

const firstName = (full: string | null | undefined) => (full ?? '').trim().split(/\s+/)[0] || 'zdravo'

/** Tekst poruke i parametri WhatsApp template-a ({{1}}, {{2}}…) za svaku vrstu obaveštenja. */
export function buildMessage(
  kind: string,
  payload: Record<string, unknown>,
  ctx: MessageContext,
): Built | null {
  const name = firstName(ctx.name)
  const day = String(payload.due_day ?? '')
  const link = (path: string) => `${ctx.appUrl.replace(/\/$/, '')}${path}`
  switch (kind) {
    case 'plan_ready': {
      const url = link('/app/dan-1')
      return {
        subject: 'Tvoj plan je spreman',
        text: `${name}, tvoj plan je spreman. Otvori ga i kreni sa danom 1: ${url}`,
        params: [name, url],
      }
    }
    case 'feedback_due': {
      const url = link(`/app/feedback/${day}`)
      return {
        subject: `Feedback za dan ${day}`,
        text: `${name}, prošlo je ${day} dana. Popuni feedback za 2 minuta da Olgica i Ognjen prilagode plan: ${url}`,
        params: [name, day, url],
      }
    }
    case 'feedback_reminder': {
      const url = link(`/app/feedback/${day}`)
      return {
        subject: `Podsetnik: feedback za dan ${day}`,
        text: `${name}, čekamo tvoj feedback za dan ${day}. Treba ti samo 2 minuta: ${url}`,
        params: [name, day, url],
      }
    }
    case 'team_reply': {
      const url = link(`/app/feedback/${day}`)
      const reply = typeof payload.body === 'string' ? payload.body : ''
      return {
        subject: 'Odgovor tima na tvoj feedback',
        text: `${name}, stigao je odgovor tima na tvoj feedback:\n\n${reply}\n\nCeo odgovor: ${url}`,
        params: [name, url],
      }
    }
    case 'program_end': {
      const url = link('/app/tok')
      const left = String(payload.days_left ?? 2)
      return {
        subject: 'Program se bliži kraju',
        text: `${name}, do kraja programa ostaju ${left} dana. Pogledaj tok i rezultate: ${url}`,
        params: [name, left, url],
      }
    }
    case 'report_ready': {
      const url = link('/app/kraj')
      return {
        subject: 'Tvoj završni izveštaj je spreman',
        text: `${name}, tim je napisao tvoj završni izveštaj. Pogledaj ga i izaberi šta dalje: ${url}`,
        params: [name, url],
      }
    }
    default:
      return null
  }
}

type Row = {
  id: string
  client_id: string
  kind: string
  channel: Channel
  template: string | null
  payload: Record<string, unknown>
  dedupe_key: string | null
  attempts: number
}

export type DispatchResult = { sent: number; retried: number; failed: number; skipped: number }

/** Greška koja se ne ponavlja (nema broja, nema podešavanja): ide direktno na fallback. */
class PermanentError extends Error {}

const env = (name: string) => Deno.env.get(name) ?? ''

async function sendWhatsApp(phone: string, template: string, params: string[]) {
  const token = env('WHATSAPP_TOKEN')
  const phoneId = env('WHATSAPP_PHONE_ID')
  if (!token || !phoneId) throw new PermanentError('WhatsApp nije podešen (WHATSAPP_TOKEN, WHATSAPP_PHONE_ID)')
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone.replace(/[^\d]/g, ''),
      type: 'template',
      template: {
        name: template,
        language: { code: env('WHATSAPP_LANG') || 'sr' },
        components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
      },
    }),
  })
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 300)}`)
}

/** Web push na sve uređaje klijenta. Vraća broj uređaja koji su primili poruku; mrtve pretplate (404/410) se brišu. */
async function sendPush(admin: SupabaseClient, clientId: string, built: Built): Promise<number> {
  const publicKey = env('VAPID_PUBLIC_KEY')
  const privateKey = env('VAPID_PRIVATE_KEY')
  if (!publicKey || !privateKey) throw new PermanentError('Push nije podešen (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)')
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', clientId)
  if (!subs || subs.length === 0) return 0
  webpush.setVapidDetails(env('VAPID_SUBJECT') || `mailto:${env('EMAIL_FROM')}`, publicKey, privateKey)
  const url = built.text.match(/https?:\/\/\S+$/)?.[0] ?? ''
  const payload = JSON.stringify({
    title: built.subject,
    body: built.text.replace(/\s*https?:\/\/\S+$/, ''),
    url,
  })
  let delivered = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
      delivered++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', sub.id)
      else throw e
    }
  }
  return delivered
}

async function sendEmail(to: string, subject: string, text: string) {
  const key = env('RESEND_API_KEY')
  const from = env('EMAIL_FROM')
  if (!key || !from) throw new PermanentError('Email nije podešen (RESEND_API_KEY, EMAIL_FROM)')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`)
}

export type NewNotification = {
  clientId: string
  kind: Kind
  channels: Channel[]
  payload: Record<string, unknown>
  /** Osnova dedupe ključa, npr. 'fb:<id>:due'; kanal se dodaje ('…:whatsapp'). */
  dedupeBase: string
  scheduledFor?: Date
}

/** Upisuje po jedan red po kanalu; ponovljen poziv sa istim ključem ništa ne duplira. */
export async function enqueue(admin: SupabaseClient, n: NewNotification) {
  const when = (n.scheduledFor ?? new Date()).toISOString()
  const { error } = await admin.from('notifications').upsert(
    n.channels.map((channel) => ({
      client_id: n.clientId,
      kind: n.kind,
      channel,
      template: channel === 'whatsapp' ? TEMPLATE[n.kind] : null,
      payload: n.payload,
      scheduled_for: when,
      dedupe_key: `${n.dedupeBase}:${channel}`,
    })),
    { onConflict: 'dedupe_key', ignoreDuplicates: true },
  )
  if (error) throw error
}

/**
 * Kanali koje je klijent izabrao na Dan 1 (profiles.preferred_channels): WhatsApp, email i/ili aplikacija (push, samo
 * ako ima bar jedan uređaj). Bez WhatsApp-a i emaila uvek ide email, pa poruka ne zavisi od pusha.
 */
export async function clientChannels(admin: SupabaseClient, clientId: string): Promise<Channel[]> {
  const { data } = await admin.from('profiles').select('preferred_channels').eq('id', clientId).maybeSingle()
  const raw = (data?.preferred_channels ?? []) as string[]
  const channels = raw.filter((c) => c === 'whatsapp' || c === 'email') as Channel[]
  if (channels.length === 0) channels.push('email')
  if (raw.includes('app')) {
    const { count } = await admin
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', clientId)
    if ((count ?? 0) > 0) channels.push('app')
  }
  return channels
}

/** Šalje poruke iz reda čiji je `scheduled_for` prošao. Vraća brojače za log i test. */
export async function dispatchQueued(
  admin: SupabaseClient,
  opts: { now?: Date; limit?: number; programId?: string } = {},
): Promise<DispatchResult> {
  const now = opts.now ?? new Date()
  const result: DispatchResult = { sent: 0, retried: 0, failed: 0, skipped: 0 }
  let query = admin
    .from('notifications')
    .select('id, client_id, kind, channel, template, payload, dedupe_key, attempts')
    .eq('status', 'queued')
    .lte('scheduled_for', now.toISOString())
    .order('scheduled_for')
    .limit(opts.limit ?? 50)
  if (opts.programId) query = query.eq('payload->>program_id', opts.programId)
  const { data: rows, error } = await query
  if (error) throw error

  const dryRun = env('NOTIFY_DRY_RUN') === 'true'
  const appUrl = env('APP_URL') || 'http://localhost:5173'
  const profiles = new Map<string, { full_name: string | null; email: string; phone: string | null }>()

  for (const row of (rows ?? []) as Row[]) {
    // zauzimanje reda: samo jedan istovremeni poziv sme da pošalje istu poruku
    const { data: claimed } = await admin
      .from('notifications')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id)
      .eq('status', 'queued')
      .eq('attempts', row.attempts)
      .select('id')
    if (!claimed || claimed.length === 0) continue
    const attempt = row.attempts + 1

    try {
      if (!profiles.has(row.client_id)) {
        const { data: p } = await admin
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', row.client_id)
          .maybeSingle()
        if (p) profiles.set(row.client_id, p)
      }
      const profile = profiles.get(row.client_id)
      if (!profile) throw new PermanentError('Klijent nije pronađen')
      const built = buildMessage(row.kind, row.payload ?? {}, { name: profile.full_name ?? '', appUrl })
      if (!built) throw new PermanentError(`Nepoznata vrsta poruke: ${row.kind}`)

      if (row.channel === 'app') {
        if (dryRun) console.log(`[dry-run] push → ${row.client_id}: ${built.text}`)
        else if ((await sendPush(admin, row.client_id, built)) === 0) {
          throw new PermanentError('Nema uređaja za push (poruka je poslata ostalim kanalima)')
        }
      } else if (row.channel === 'whatsapp') {
        if (!profile.phone) throw new PermanentError('Klijent nema broj telefona')
        if (dryRun) console.log(`[dry-run] whatsapp → ${row.client_id}: ${built.text}`)
        else await sendWhatsApp(profile.phone, row.template ?? TEMPLATE[row.kind as Kind], built.params)
      } else if (dryRun) {
        console.log(`[dry-run] email → ${row.client_id}: ${built.text}`)
      } else {
        await sendEmail(profile.email, built.subject, built.text)
      }

      await admin
        .from('notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
        .eq('id', row.id)
      result.sent++
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const permanent = e instanceof PermanentError
      if (!permanent && attempt < MAX_ATTEMPTS) {
        const retryAt = new Date(now.getTime() + RETRY_DELAY_MIN * attempt * 60_000)
        await admin
          .from('notifications')
          .update({ scheduled_for: retryAt.toISOString(), error: message })
          .eq('id', row.id)
        result.retried++
        continue
      }
      await admin.from('notifications').update({ status: 'failed', error: message }).eq('id', row.id)
      result.failed++
      // fallback: WhatsApp nije stigao, isti sadržaj ide emailom (ako već ne postoji)
      if (row.channel === 'whatsapp' && row.dedupe_key?.endsWith(':whatsapp')) {
        await enqueue(admin, {
          clientId: row.client_id,
          kind: row.kind as Kind,
          channels: ['email'],
          payload: row.payload ?? {},
          dedupeBase: row.dedupe_key.slice(0, -':whatsapp'.length),
          scheduledFor: now,
        })
      }
    }
  }
  return result
}
