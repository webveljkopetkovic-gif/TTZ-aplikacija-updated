// Tim odgovara na feedback: odgovor se upisuje (feedback_replies), status 'answered', a klijent dobija poruku
// na izabrane kanale (WhatsApp + email) kroz notifications. Tim ne zove klijente.
import { z } from 'zod'
import { adminClient, callerOf, HttpError, json, serve, TEAM_ROLES } from '../_shared/http.ts'
import { findMealRuleViolation } from '../_shared/mealRules.ts'
import { dispatchQueued, enqueue } from '../_shared/notify.ts'

const body = z.object({
  feedback_id: z.guid(),
  body: z.string().trim().min(1, 'Upiši odgovor').max(2000, 'Odgovor je predugačak'),
  channels: z.array(z.enum(['whatsapp', 'email'])).min(1, 'Izaberi bar jedan kanal'),
})

serve(async (req, raw) => {
  const parsed = body.safeParse(raw)
  if (!parsed.success) {
    throw new HttpError(parsed.error.issues[0]?.message ?? 'Neispravan zahtev', 400)
  }
  const { feedback_id, channels } = parsed.data
  const text = parsed.data.body

  const admin = adminClient()
  const caller = await callerOf(admin, req)
  if (!caller) throw new HttpError('Potrebna je prijava', 401)
  if (!TEAM_ROLES.includes(caller.role)) throw new HttpError('Odgovara samo tim', 403)

  // isto pravilo kao u planu: bez kalorija i grama (CLAUDE.md)
  const violation = findMealRuleViolation(text)
  if (violation) throw new HttpError(`${violation}. Opiši bez brojeva i mera.`, 400)

  const { data: feedback, error } = await admin
    .from('feedbacks')
    .select('id, due_day, status, programs ( client_id )')
    .eq('id', feedback_id)
    .maybeSingle()
  if (error) throw error
  const clientId = (feedback as unknown as { programs?: { client_id: string } } | null)?.programs
    ?.client_id
  if (!feedback || !clientId) throw new HttpError('Feedback nije pronađen', 404)
  if (feedback.status !== 'submitted' && feedback.status !== 'answered') {
    throw new HttpError('Klijent još nije poslao feedback', 409)
  }

  const now = new Date()
  const { data: reply, error: replyError } = await admin
    .from('feedback_replies')
    .insert({
      feedback_id,
      author_id: caller.id,
      body: text,
      sent_channels: channels,
      sent_at: now.toISOString(),
    })
    .select('id')
    .single()
  if (replyError) throw replyError

  const { error: statusError } = await admin
    .from('feedbacks')
    .update({ status: 'answered' })
    .eq('id', feedback_id)
  if (statusError) throw statusError

  await enqueue(admin, {
    clientId,
    kind: 'team_reply',
    channels,
    payload: { feedback_id, due_day: feedback.due_day, reply_id: reply.id, body: text },
    dedupeBase: `reply:${reply.id}`,
    scheduledFor: now,
  })
  // greška slanja ne sme da poništi odgovor: poruka ostaje u redu i ide na retry
  const sent = await dispatchQueued(admin, { now }).catch(() => null)

  return json({ reply_id: reply.id, status: 'answered', channels, sent })
})
