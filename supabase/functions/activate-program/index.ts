// Klijent otvara gotov plan: Dan 1 = danas po Beogradu (programs.activated_at), status 'active',
// feedbacki za dane 10/20/30. Idempotentno: ponovljen poziv ne menja datum aktivacije.
import { z } from 'zod'
import { adminClient, HttpError, json, serve } from '../_shared/http.ts'
import { belgradeToday, feedbackSchedule } from '../_shared/schedule.ts'

const body = z.object({ program_id: z.guid() })

serve(async (req, raw) => {
  const parsed = body.safeParse(raw)
  if (!parsed.success) throw new HttpError('Neispravan zahtev', 400)

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new HttpError('Potrebna je prijava', 401)

  const admin = adminClient()
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) throw new HttpError('Potrebna je prijava', 401)

  const { data: program, error } = await admin
    .from('programs')
    .select('id, client_id, status, duration_days, activated_at')
    .eq('id', parsed.data.program_id)
    .maybeSingle()
  if (error) throw error
  // tuđ program se ne razlikuje od nepostojećeg
  if (!program || program.client_id !== userData.user.id) throw new HttpError('Program nije pronađen', 404)

  if (program.status === 'active' && program.activated_at) {
    return json({ program_id: program.id, activated_at: program.activated_at, already_active: true })
  }
  if (program.status !== 'ready') throw new HttpError('Plan još nije spreman', 409)

  const today = belgradeToday()
  const { data: updated, error: updateError } = await admin
    .from('programs')
    .update({ status: 'active', activated_at: today })
    .eq('id', program.id)
    .eq('status', 'ready')
    .select('id')
  if (updateError) throw updateError
  if (!updated || updated.length === 0) {
    // drugi istovremeni poziv je već aktivirao program
    const { data: current } = await admin.from('programs').select('activated_at').eq('id', program.id).single()
    return json({ program_id: program.id, activated_at: current?.activated_at ?? today, already_active: true })
  }

  const { error: feedbackError } = await admin.from('feedbacks').upsert(
    feedbackSchedule(today, program.duration_days).map((f) => ({ program_id: program.id, ...f })),
    { onConflict: 'program_id,due_day', ignoreDuplicates: true },
  )
  if (feedbackError) throw feedbackError

  return json({ program_id: program.id, activated_at: today, already_active: false })
})
