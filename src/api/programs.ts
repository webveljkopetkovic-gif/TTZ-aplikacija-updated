import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Najnoviji program prijavljenog klijenta, sa planom i anketom (RLS vraća samo njegove redove). */
export function useCurrentProgram(userId: string | undefined) {
  return useQuery({
    queryKey: ['program', userId],
    enabled: !!userId,
    // dok čeka uplatu ili plan, status se osvežava sam
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'awaiting_payment' || status === 'building_plan' ? 10_000 : false
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select(
          `id, status, duration_days, exercise_level, plan_focus, paid_at, plan_ready_at, activated_at, created_at,
           products ( name, kind ),
           intake_surveys ( submitted_at, answers )`,
        )
        .eq('client_id', userId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export type CurrentProgram = NonNullable<ReturnType<typeof useCurrentProgram>['data']>

/** Najnovija uplata za program (iznos i poziv na broj za instrukcije). */
export function useProgramPayment(programId: string | undefined) {
  return useQuery({
    queryKey: ['payment', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount_rsd, provider, provider_ref, status, paid_at')
        .eq('program_id', programId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export interface ManualPaymentSettings {
  recipient: string
  account: string
}

/** Primalac i račun za ručnu uplatu (app_settings, ključ `manual_payment`). */
export function useManualPaymentSettings() {
  return useQuery({
    queryKey: ['settings', 'manual_payment'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ManualPaymentSettings | null> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'manual_payment')
        .maybeSingle()
      if (error) throw error
      return (data?.value as unknown as ManualPaymentSettings | undefined) ?? null
    },
  })
}

/** Broj nalaza koje je klijent dodao (anketa + kasnije dodati). */
export function useLabFileCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['lab-files', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('lab_files')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', userId!)
      if (error) throw error
      return count ?? 0
    },
  })
}

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
}

/** Klijent sa nalogom dodaje nalaz u svoj folder (labs/<client_id>/) i upisuje ga u lab_files. */
export function useAddLabFile(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      const type = file.type || MIME_BY_EXTENSION[extension]
      if (!type || !(extension in MIME_BY_EXTENSION))
        throw new Error('Dozvoljeni su PDF, JPG, PNG i HEIC')
      if (file.size > 10 * 1024 * 1024) throw new Error('Fajl je veći od 10 MB')

      const path = `${userId}/${crypto.randomUUID()}.${extension}`
      const upload = await supabase.storage.from('labs').upload(path, file, { contentType: type })
      if (upload.error) throw new Error('Slanje fajla nije uspelo. Pokušaj ponovo.')

      const { error } = await supabase
        .from('lab_files')
        .insert({ client_id: userId!, storage_path: path, label: file.name })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-files', userId] }),
  })
}
