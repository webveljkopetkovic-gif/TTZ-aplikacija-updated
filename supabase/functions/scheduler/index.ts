// Scheduler (pg_cron svakih 15 min): otvara feedback u 09:00 po Beogradu, podsetnik posle 24 h, 'late' posle 48 h,
// najava kraja na dan 28, 'ended' posle poslednjeg dana. Poruke idu kroz notifications (dedupe_key), pa
// ponovljen ili istovremen poziv ne pravi duplikate. Poziva se samo sa service role ključem.
import { z } from 'zod'
import { adminClient, HttpError, isServiceCall, json, serve } from '../_shared/http.ts'
import {
  feedbackActions,
  programActions,
  type FeedbackRow,
  type ProgramRow,
} from '../_shared/feedbackRules.ts'
import { belgradeToday } from '../_shared/schedule.ts'
import { clientChannels, dispatchQueued, enqueue } from '../_shared/notify.ts'

// `now` služi testovima sa lažnim vremenom (dan 10 u 08:59, 09:00, +24 h, +48 h)
// `program_id` sužava obradu na jedan program (testovi, ručno pokretanje)
const body = z.object({
  now: z.iso.datetime().optional(),
  dispatch: z.boolean().optional(),
  program_id: z.guid().optional(),
})

serve(async (req, raw) => {
  if (!isServiceCall(req)) throw new HttpError('Nedozvoljen poziv', 403)
  const parsed = body.safeParse(raw ?? {})
  if (!parsed.success) throw new HttpError('Neispravan zahtev', 400)
  const now = parsed.data.now ? new Date(parsed.data.now) : new Date()
  const admin = adminClient()
  const done = { opened: 0, reminded: 0, late: 0, announced: 0, ended: 0 }

  const only = parsed.data.program_id
  let feedbackQuery = admin
    .from('feedbacks')
    .select(
      'id, program_id, due_day, due_date, status, reminder_count, programs!inner ( client_id, status )',
    )
    .in('status', ['scheduled', 'open'])
    .in('programs.status', ['active', 'ended', 'renewed'])
    .lte('due_date', belgradeToday(now))
  if (only) feedbackQuery = feedbackQuery.eq('program_id', only)
  const { data: feedbacks, error } = await feedbackQuery
  if (error) throw error

  const channelsCache = new Map<string, Awaited<ReturnType<typeof clientChannels>>>()
  const channelsOf = async (clientId: string) => {
    if (!channelsCache.has(clientId)) channelsCache.set(clientId, await clientChannels(admin, clientId))
    return channelsCache.get(clientId)!
  }

  for (const f of feedbacks ?? []) {
    const clientId = (f as unknown as { programs: { client_id: string } }).programs.client_id
    for (const action of feedbackActions(f as unknown as FeedbackRow, now)) {
      const payload = { feedback_id: f.id, program_id: f.program_id, due_day: f.due_day }
      if (action.type === 'open') {
        const { data } = await admin
          .from('feedbacks')
          .update({ status: 'open' })
          .eq('id', f.id)
          .eq('status', 'scheduled')
          .select('id')
        if (data?.length) {
          await enqueue(admin, {
            clientId,
            kind: 'feedback_due',
            channels: await channelsOf(clientId),
            payload,
            dedupeBase: `fb:${f.id}:due`,
            scheduledFor: now,
          })
          done.opened++
        }
      } else if (action.type === 'remind') {
        const { data } = await admin
          .from('feedbacks')
          .update({ reminder_count: 1, last_reminded_at: now.toISOString() })
          .eq('id', f.id)
          .eq('status', 'open')
          .eq('reminder_count', 0)
          .select('id')
        if (data?.length) {
          await enqueue(admin, {
            clientId,
            kind: 'feedback_reminder',
            channels: await channelsOf(clientId),
            payload,
            dedupeBase: `fb:${f.id}:r1`,
            scheduledFor: now,
          })
          done.reminded++
        }
      } else {
        const { data } = await admin
          .from('feedbacks')
          .update({ status: 'late' })
          .eq('id', f.id)
          .eq('status', 'open')
          .select('id')
        if (data?.length) done.late++
      }
    }
  }

  let programQuery = admin
    .from('programs')
    .select('id, client_id, status, activated_at, duration_days')
    .eq('status', 'active')
  if (only) programQuery = programQuery.eq('id', only)
  const { data: programs, error: programError } = await programQuery
  if (programError) throw programError

  for (const p of programs ?? []) {
    for (const action of programActions(p as ProgramRow, now)) {
      if (action.type === 'announce_end') {
        await enqueue(admin, {
          clientId: p.client_id,
          kind: 'program_end',
          channels: await channelsOf(p.client_id),
          payload: { program_id: p.id, days_left: 2 },
          dedupeBase: `end:${p.id}:announce`,
          scheduledFor: now,
        })
        done.announced++
      } else {
        const { data } = await admin
          .from('programs')
          .update({ status: 'ended' })
          .eq('id', p.id)
          .eq('status', 'active')
          .select('id')
        if (data?.length) done.ended++
      }
    }
  }

  const sent = parsed.data.dispatch === false ? null : await dispatchQueued(admin, { now, programId: only })
  return json({ now: now.toISOString(), ...done, sent })
})
