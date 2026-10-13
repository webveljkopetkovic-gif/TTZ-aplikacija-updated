import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/** Greška iz Edge Function sa porukom na srpskom i HTTP statusom. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields?: Record<string, string>,
  ) {
    super(message)
  }
}

const GENERIC_ERROR = 'Došlo je do greške. Pokušaj ponovo.'

/** Poziva Edge Function i pretvara greške u ApiError (poruka dolazi sa servera). */
export async function invokeFunction<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body: body as object })
  if (!error) return data as T

  if (error instanceof FunctionsHttpError) {
    const payload = (await error.context.json().catch(() => null)) as {
      error?: string
      fields?: Record<string, string>
    } | null
    throw new ApiError(payload?.error ?? GENERIC_ERROR, error.context.status, payload?.fields)
  }
  throw new ApiError(GENERIC_ERROR, 0)
}
