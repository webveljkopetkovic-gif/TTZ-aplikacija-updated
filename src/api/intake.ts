import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { LabFileRef } from '@/lib/intakeSchema'
import { invokeFunction } from './functions'

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
}
const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

/** Šalje nalaz odmah: Edge Function vraća potpisani upload u labs/intake/<intake_id>/. */
export async function uploadIntakeFile(intakeId: string, file: File): Promise<LabFileRef> {
  const { path, token } = await invokeFunction<{ path: string; token: string }>(
    'upload-intake-file',
    {
      action: 'create',
      intake_id: intakeId,
      filename: file.name,
      size: file.size,
      type: file.type,
    },
  )
  const { error } = await supabase.storage.from('labs').uploadToSignedUrl(path, token, file, {
    contentType: file.type || MIME_BY_EXTENSION[extensionOf(file.name)],
  })
  if (error) throw new Error('Slanje fajla nije uspelo. Pokušaj ponovo.')
  return { path, name: file.name, size: file.size, type: file.type }
}

export async function removeIntakeFile(intakeId: string, path: string): Promise<void> {
  await invokeFunction('upload-intake-file', { action: 'remove', intake_id: intakeId, path })
}

export interface SubmitIntakeResult {
  intake_id: string
  email: string
}

export function useSubmitIntake() {
  return useMutation({
    mutationFn: (input: { intakeId: string; answers: unknown }) =>
      invokeFunction<SubmitIntakeResult>('submit-intake', {
        intake_id: input.intakeId,
        answers: input.answers,
      }),
  })
}
