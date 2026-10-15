// Tim objavljuje završni izveštaj: beleške Olgice i Ognjena + rezultati programa → PDF u bucket `reports`
// i poruka klijentu (WhatsApp + email). Ponovna objava osvežava tekst i PDF, ali ne šalje poruku ponovo.
import { z } from 'zod'
import { adminClient, callerOf, HttpError, json, serve, TEAM_ROLES } from '../_shared/http.ts'
import { findMealRuleViolation } from '../_shared/mealRules.ts'
import { clientChannels, dispatchQueued, enqueue } from '../_shared/notify.ts'
import type { ProgramResults } from '../_shared/programResults.ts'
import { buildReportPdf } from '../_shared/reportPdf.ts'

const body = z.object({
  program_id: z.guid(),
  nutrition_note: z.string().trim().min(1, 'Upiši Olgicin deo izveštaja').max(1500, 'Tekst je predugačak'),
  training_note: z.string().trim().max(1500, 'Tekst je predugačak').default(''),
  recommendation: z.enum(['continue', 'nutrition_only', 'end']).nullable().default(null),
})

serve(async (req, raw) => {
  const parsed = body.safeParse(raw)
  if (!parsed.success) {
    throw new HttpError(parsed.error.issues[0]?.message ?? 'Neispravan zahtev', 400)
  }
  const input = parsed.data

  const admin = adminClient()
  const caller = await callerOf(admin, req)
  if (!caller) throw new HttpError('Potrebna je prijava', 401)
  if (!TEAM_ROLES.includes(caller.role)) throw new HttpError('Izveštaj objavljuje samo tim', 403)

  // isto pravilo kao u planu: bez kalorija i grama (CLAUDE.md)
  for (const note of [input.nutrition_note, input.training_note]) {
    const violation = findMealRuleViolation(note)
    if (violation) throw new HttpError(`${violation}. Opiši bez brojeva i mera.`, 400)
  }

  const { data: program, error } = await admin
    .from('programs')
    .select(
      'id, client_id, status, plan_focus, products ( name, kind ), profiles!programs_client_id_fkey ( full_name )',
    )
    .eq('id', input.program_id)
    .maybeSingle()
  if (error) throw error
  if (!program) throw new HttpError('Program nije pronađen', 404)
  if (!['active', 'ended', 'renewed'].includes(program.status)) {
    throw new HttpError('Izveštaj se piše za program koji je počeo', 409)
  }
  const meta = program as unknown as {
    products: { name: string; kind: string } | null
    profiles: { full_name: string | null } | null
  }
  const withTraining = meta.products?.kind === 'nutrition_training'

  const { data: results, error: resultsError } = await admin.rpc('program_results', {
    p_program_id: program.id,
  })
  if (resultsError || !results) throw resultsError ?? new Error('Rezultati nisu dostupni')

  const now = new Date()
  const date = new Intl.DateTimeFormat('sr-Latn', {
    timeZone: 'Europe/Belgrade',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(now)

  const pdf = await buildReportPdf({
    clientName: meta.profiles?.full_name ?? 'Klijent',
    planName: meta.products?.name ?? 'Program',
    focus: program.plan_focus,
    withTraining,
    results: results as ProgramResults,
    nutritionNote: input.nutrition_note,
    trainingNote: withTraining ? input.training_note : '',
    recommendation: input.recommendation,
    date,
  })

  const path = `${program.client_id}/${program.id}.pdf`
  const { error: uploadError } = await admin.storage
    .from('reports')
    .upload(path, pdf, { contentType: 'application/pdf', upsert: true })
  if (uploadError) throw uploadError

  const { data: existing } = await admin
    .from('program_reports')
    .select('published_at')
    .eq('program_id', program.id)
    .maybeSingle()
  const firstPublish = !existing?.published_at

  const { error: saveError } = await admin.from('program_reports').upsert(
    {
      program_id: program.id,
      author_id: caller.id,
      nutrition_note: input.nutrition_note,
      training_note: withTraining ? input.training_note : '',
      recommendation: input.recommendation,
      results,
      pdf_path: path,
      published_at: existing?.published_at ?? now.toISOString(),
      updated_at: now.toISOString(),
    },
    { onConflict: 'program_id' },
  )
  if (saveError) throw saveError

  if (firstPublish) {
    await enqueue(admin, {
      clientId: program.client_id,
      kind: 'report_ready',
      channels: await clientChannels(admin, program.client_id),
      payload: { program_id: program.id },
      dedupeBase: `report:${program.id}`,
      scheduledFor: now,
    })
    // neuspelo slanje ne sme da poništi izveštaj: poruka ostaje u redu
    await dispatchQueued(admin, { now, programId: program.id }).catch((e) =>
      console.error('Slanje poruke nije uspelo', e),
    )
  }

  return json({ program_id: program.id, pdf_path: path, first_publish: firstPublish })
})
