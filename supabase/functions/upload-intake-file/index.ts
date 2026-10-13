// Nalazi iz ankete se šalju pre naloga, pa ih prima ova funkcija (service role).
// "create" vraća potpisani upload u labs/intake/<intake_id>/<uuid>.<ext>, "remove" briše fajl iz nacrta.
import { z } from 'zod'
import { adminClient, enforceRateLimit, HttpError, json, serve } from '../_shared/http.ts'
import { LAB_FILE_EXTENSIONS, MAX_LAB_FILE_BYTES, MAX_LAB_FILES } from '../_shared/intakeSchema.ts'

const body = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    intake_id: z.guid(),
    filename: z.string().min(1).max(200),
    size: z.number().int().positive(),
    type: z.string().max(100).optional(),
  }),
  z.object({
    action: z.literal('remove'),
    intake_id: z.guid(),
    path: z.string().min(1).max(300),
  }),
])

serve(async (req, raw) => {
  const parsed = body.safeParse(raw)
  if (!parsed.success) throw new HttpError('Neispravan zahtev', 400)
  const input = parsed.data

  const admin = adminClient()
  await enforceRateLimit(admin, req, 'upload-intake-file', 100)

  // Anketa koja je već poslata ne prima nove fajlove
  const { data: existing, error: lookupError } = await admin
    .from('intake_surveys')
    .select('id')
    .eq('id', input.intake_id)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (existing) throw new HttpError('Anketa je već poslata', 409)

  const folder = `intake/${input.intake_id}`

  if (input.action === 'remove') {
    if (!input.path.startsWith(`${folder}/`) || input.path.includes('..')) {
      throw new HttpError('Neispravna putanja', 400)
    }
    const { error } = await admin.storage.from('labs').remove([input.path])
    if (error) throw error
    return json({ ok: true })
  }

  const extension = input.filename.split('.').pop()?.toLowerCase() ?? ''
  if (!(LAB_FILE_EXTENSIONS as readonly string[]).includes(extension)) {
    throw new HttpError('Dozvoljeni su PDF, JPG, PNG i HEIC', 400)
  }
  if (input.size > MAX_LAB_FILE_BYTES) throw new HttpError('Fajl je veći od 10 MB', 413)

  const { data: files, error: listError } = await admin.storage.from('labs').list(folder, { limit: 100 })
  if (listError) throw listError
  if ((files ?? []).length >= MAX_LAB_FILES) throw new HttpError('Najviše 10 fajlova', 400)

  const path = `${folder}/${crypto.randomUUID()}.${extension}`
  const { data, error } = await admin.storage.from('labs').createSignedUploadUrl(path)
  if (error || !data) throw error ?? new Error('Potpisani URL nije napravljen')

  // Veličinu i tip fajla dodatno nameće bucket `labs` (10 MB, pdf/jpeg/png/heic)
  return json({ path, token: data.token })
})
