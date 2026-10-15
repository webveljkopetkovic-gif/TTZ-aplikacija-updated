// Klijent šalje feedback (dan 10/20/30): provera odgovora, answers + status 'submitted' i merenje istog dana.
// Ide kroz funkciju (a ne direktan update), da klijent ne može da menja status, due_date ili tuđ feedback.
import { z } from 'zod'
import { adminClient, callerOf, HttpError, json, serve } from '../_shared/http.ts'
import { FEEDBACK_SCHEMA_VERSION, makeFeedbackSchema } from '../_shared/feedbackSchema.ts'

const body = z.object({ feedback_id: z.guid(), answers: z.unknown() })

serve(async (req, raw) => {
  const parsed = body.safeParse(raw)
  if (!parsed.success) throw new HttpError('Neispravan zahtev', 400)

  const admin = adminClient()
  const caller = await callerOf(admin, req)
  if (!caller) throw new HttpError('Potrebna je prijava', 401)

  const { data: feedback, error } = await admin
    .from('feedbacks')
    .select('id, due_day, status, program_id, programs ( client_id, products ( kind ) )')
    .eq('id', parsed.data.feedback_id)
    .maybeSingle()
  if (error) throw error
  const program = (
    feedback as unknown as {
      programs?: { client_id: string; products?: { kind: string } | null }
    } | null
  )?.programs
  // tuđ feedback se ne razlikuje od nepostojećeg
  if (!feedback || !program || program.client_id !== caller.id) {
    throw new HttpError('Feedback nije pronađen', 404)
  }
  if (feedback.status === 'scheduled') throw new HttpError('Feedback još nije otvoren', 409)
  if (feedback.status !== 'open' && feedback.status !== 'late') {
    throw new HttpError('Feedback je već poslat', 409)
  }

  const schema = makeFeedbackSchema({ withTraining: program.products?.kind === 'nutrition_training' })
  const result = schema.safeParse(parsed.data.answers)
  if (!result.success) {
    const fields: Record<string, string> = {}
    for (const issue of result.error.issues) fields[issue.path.join('.') || 'form'] ??= issue.message
    throw new HttpError('Proveri odgovore', 400, fields)
  }
  const answers = result.data

  const { data: updated, error: updateError } = await admin
    .from('feedbacks')
    .update({
      answers: { ...answers, version: FEEDBACK_SCHEMA_VERSION },
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', feedback.id)
    .in('status', ['open', 'late'])
    .select('id')
  if (updateError) throw updateError
  if (!updated?.length) throw new HttpError('Feedback je već poslat', 409)

  const { error: measureError } = await admin.from('measurements').upsert(
    {
      program_id: feedback.program_id,
      program_day: feedback.due_day,
      weight_kg: answers.weight_kg,
      waist_cm: answers.waist_cm ?? null,
      energy_am: answers.energy_am,
    },
    { onConflict: 'program_id,program_day' },
  )
  if (measureError) throw measureError

  return json({ feedback_id: feedback.id, status: 'submitted' })
})
