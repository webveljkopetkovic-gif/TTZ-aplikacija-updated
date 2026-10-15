// Tim šalje plan klijentu jednim klikom: provera plana, status 'ready', plan_ready_at i poruka 'plan_ready'.
// Samo red u notifications; slanje (WhatsApp, email) dolazi u Fazi 5. Idempotentno: drugi poziv ništa ne duplira.
import { z } from 'zod'
import { adminClient, HttpError, json, serve } from '../_shared/http.ts'
import { mealViolation } from '../_shared/mealRules.ts'

const body = z.object({ program_id: z.guid() })
const TEAM_ROLES = ['nutritionist', 'trainer', 'admin']
const PLAN_DAYS = 14

serve(async (req, raw) => {
  const parsed = body.safeParse(raw)
  if (!parsed.success) throw new HttpError('Neispravan zahtev', 400)
  const programId = parsed.data.program_id

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new HttpError('Potrebna je prijava', 401)

  const admin = adminClient()
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) throw new HttpError('Potrebna je prijava', 401)
  const { data: caller } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
  if (!caller || !TEAM_ROLES.includes(caller.role)) throw new HttpError('Plan šalje samo tim', 403)

  const { data: program, error } = await admin
    .from('programs')
    .select('id, client_id, status, exercise_level, training_weekdays, products ( kind ), intake_surveys ( answers )')
    .eq('id', programId)
    .maybeSingle()
  if (error) throw error
  if (!program) throw new HttpError('Program nije pronađen', 404)
  if (program.status === 'ready') return json({ program_id: programId, already_published: true })
  if (program.status !== 'building_plan') throw new HttpError('Plan se šalje samo dok se pravi (dan 0)', 409)

  // ishrana: svi dani 1–14 moraju imati obrok, a nijedan tekst ne sme da krši pravilo domena
  const { data: meals, error: mealsError } = await admin
    .from('program_meals')
    .select('plan_day, title, description, recipe')
    .eq('program_id', programId)
    .eq('valid_from_cycle', 1)
  if (mealsError) throw mealsError
  const covered = new Set((meals ?? []).map((m) => m.plan_day))
  const missing = Array.from({ length: PLAN_DAYS }, (_, i) => i + 1).filter((d) => !covered.has(d))
  if (missing.length > 0) {
    throw new HttpError(`Plan ishrane nema obroke za dane: ${missing.join(', ')}`, 422)
  }
  for (const meal of meals ?? []) {
    const violation = mealViolation(meal)
    if (violation) {
      throw new HttpError(`Dan ${meal.plan_day}, „${meal.title}“: ${violation.message}`, 422, {
        plan_day: String(meal.plan_day),
      })
    }
  }

  const { data: supplements, error: supplementsError } = await admin
    .from('supplements')
    .select('name, timing, note')
    .eq('program_id', programId)
    .eq('active', true)
  if (supplementsError) throw supplementsError
  for (const s of supplements ?? []) {
    const violation = mealViolation({ title: s.name, description: s.timing, recipe: s.note })
    if (violation) throw new HttpError(`Suplement „${s.name}“: ${violation.message}`, 422)
  }

  const products = program.products as unknown as { kind: string } | null
  if (products?.kind === 'nutrition_training') {
    if (!program.exercise_level) throw new HttpError('Izaberi nivo vežbi pre slanja plana', 422)
    if (!program.training_weekdays?.length) throw new HttpError('Izaberi dane treninga pre slanja plana', 422)
  }

  // prelaz je uslovan, pa dva istovremena klika ne prave dve poruke
  const now = new Date().toISOString()
  const { data: updated, error: updateError } = await admin
    .from('programs')
    .update({ status: 'ready', plan_ready_at: now })
    .eq('id', programId)
    .eq('status', 'building_plan')
    .select('id')
  if (updateError) throw updateError
  if (!updated || updated.length === 0) return json({ program_id: programId, already_published: true })

  const intake = program.intake_surveys as unknown as { answers: { channels?: string[] } } | null
  const channels = (intake?.answers?.channels ?? []).filter((c) => c === 'whatsapp' || c === 'email')
  const chosen = channels.length > 0 ? channels : ['email']

  const { error: notifyError } = await admin.from('notifications').upsert(
    chosen.map((channel) => ({
      client_id: program.client_id,
      kind: 'plan_ready',
      channel,
      template: channel === 'whatsapp' ? 'ttz_plan_ready' : null,
      payload: { program_id: programId },
      scheduled_for: now,
      dedupe_key: `plan_ready:${programId}:${channel}`,
    })),
    { onConflict: 'dedupe_key', ignoreDuplicates: true },
  )
  if (notifyError) throw notifyError

  return json({ program_id: programId, already_published: false, channels: chosen })
})
