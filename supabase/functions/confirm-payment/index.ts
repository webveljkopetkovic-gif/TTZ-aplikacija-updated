// Admin potvrđuje ručnu uplatu ("Uplata primljena"): uplata postaje paid, program ulazi u dan 0.
import { z } from 'zod'
import { adminClient, HttpError, json, serve } from '../_shared/http.ts'
import { markPaid } from '../_shared/markPaid.ts'

const body = z.object({ payment_id: z.guid() })

serve(async (req, raw) => {
  const parsed = body.safeParse(raw)
  if (!parsed.success) throw new HttpError('Neispravan zahtev', 400)

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new HttpError('Potrebna je prijava', 401)

  const admin = adminClient()
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) throw new HttpError('Potrebna je prijava', 401)

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') throw new HttpError('Samo admin potvrđuje uplate', 403)

  const result = await markPaid(admin, parsed.data.payment_id)
  return json({
    payment_id: result.paymentId,
    program_id: result.programId,
    already_paid: result.alreadyPaid,
  })
})
