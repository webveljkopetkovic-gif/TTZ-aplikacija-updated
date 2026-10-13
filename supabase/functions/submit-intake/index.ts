// Prima anketu pre naloga: validira istom šemom kao forma, čuva je i vraća intake_id.
import { z } from 'zod'
import { adminClient, enforceRateLimit, HttpError, json, serve } from '../_shared/http.ts'
import { exerciseLevelFromActivity } from '../_shared/intakeDerived.ts'
import { INTAKE_SCHEMA_VERSION, intakeSchema } from '../_shared/intakeSchema.ts'

const body = z.object({ intake_id: z.guid(), answers: z.unknown() })

/** Polja koja imaju svoju kolonu u intake_surveys, ostalo ide u `answers` (ANKETA.md sekcija 8). */
const COLUMN_FIELDS = [
  'full_name',
  'email',
  'phone',
  'birth_date',
  'occupation',
  'sex',
  'height_cm',
  'weight_kg',
  'country',
  'lab_files',
  'consent_health',
  'consent_terms',
] as const

serve(async (req, raw) => {
  const parsedBody = body.safeParse(raw)
  if (!parsedBody.success) throw new HttpError('Neispravan zahtev', 400)
  const { intake_id: intakeId } = parsedBody.data

  const admin = adminClient()
  await enforceRateLimit(admin, req, 'submit-intake', 10)

  const parsed = intakeSchema.safeParse(parsedBody.data.answers)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message
    throw new HttpError('Proveri odgovore u anketi', 400, fields)
  }
  const a = parsed.data

  // Fajlovi: uzimamo samo one koji stvarno postoje u intake/<id>/ (veličina i tip dolaze iz skladišta)
  const folder = `intake/${intakeId}`
  const { data: stored, error: listError } = await admin.storage.from('labs').list(folder, { limit: 100 })
  if (listError) throw listError
  const storedByName = new Map((stored ?? []).map((f) => [f.name, f]))
  const labFiles = (a.lab_files ?? []).flatMap((ref) => {
    const object = ref.path.startsWith(`${folder}/`) ? storedByName.get(ref.path.slice(folder.length + 1)) : undefined
    return object ? [{ path: ref.path, name: ref.name }] : []
  })

  const answers: Record<string, unknown> = { ...a }
  for (const key of COLUMN_FIELDS) delete answers[key]

  const { error } = await admin.from('intake_surveys').insert({
    id: intakeId,
    client_id: null,
    email: a.email,
    phone: a.phone,
    full_name: a.full_name,
    birth_date: a.birth_date,
    sex: a.sex,
    occupation: a.occupation,
    country: a.country,
    height_cm: a.height_cm,
    start_weight_kg: a.weight_kg,
    activity_level: a.activity,
    exercise_level: exerciseLevelFromActivity(a.activity),
    answers,
    schema_version: INTAKE_SCHEMA_VERSION,
    consent_health: a.consent_health,
    consent_terms: a.consent_terms,
  })
  if (error) {
    if (error.code === '23505') throw new HttpError('Anketa je već poslata', 409)
    throw error
  }

  if (labFiles.length > 0) {
    const { error: filesError } = await admin.from('lab_files').insert(
      labFiles.map((f) => ({ intake_id: intakeId, client_id: null, storage_path: f.path, label: f.name })),
    )
    if (filesError) throw filesError
  }

  return json({ intake_id: intakeId, email: a.email })
})
