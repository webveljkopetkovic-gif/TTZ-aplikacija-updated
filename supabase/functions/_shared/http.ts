import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export const errorResponse = (message: string, status: number, fields?: Record<string, string>) =>
  json(fields ? { error: message, fields } : { error: message }, status)

/** Greška koja se vraća klijentu sa porukom na srpskom i HTTP statusom. */
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields?: Record<string, string>,
  ) {
    super(message)
  }
}

/** Zajednički okvir: CORS, samo POST, JSON telo i pretvaranje HttpError u odgovor. */
export function serve(handler: (req: Request, body: unknown) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return errorResponse('Metoda nije dozvoljena', 405)

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Neispravan zahtev', 400)
    }

    try {
      return await handler(req, body)
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error.message, error.status, error.fields)
      console.error('Neočekivana greška', error)
      return errorResponse('Došlo je do greške. Pokušaj ponovo.', 500)
    }
  })
}

/** Klijent sa service role ključem: zaobilazi RLS, koristi se samo u Edge Functions. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** IP pozivaoca: Cloudflare zaglavlje ako postoji, inače poslednja vrednost X-Forwarded-For (dodaje je proxy). */
export function clientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf
  const forwarded = req.headers.get('x-forwarded-for')?.split(',').map((s) => s.trim()).filter(Boolean)
  return forwarded?.at(-1) ?? 'unknown'
}

/** Fiksni prozor po IP-u (tabela rate_limits). Baca 429 kad je limit prekoračen. */
export async function enforceRateLimit(
  admin: SupabaseClient,
  req: Request,
  name: string,
  max: number,
  windowSeconds = 3600,
): Promise<void> {
  const scale = Number(Deno.env.get('RATE_LIMIT_SCALE') ?? '1') || 1
  const { data, error } = await admin.rpc('check_rate_limit', {
    p_key: `${name}:${clientIp(req)}`,
    p_max: Math.round(max * scale),
    p_window_seconds: windowSeconds,
  })
  if (error) throw error
  if (data === false) throw new HttpError('Previše pokušaja. Pokušaj ponovo kasnije.', 429)
}
