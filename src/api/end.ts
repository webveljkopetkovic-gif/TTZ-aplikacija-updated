import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProgramResults } from '@/lib/programResults'
import { invokeFunction } from './functions'

export type Recommendation = 'continue' | 'nutrition_only' | 'end'

export type ProgramReport = {
  id: string
  program_id: string
  nutrition_note: string
  training_note: string
  recommendation: Recommendation | null
  pdf_path: string | null
  published_at: string | null
}

/** Rezultati programa (SQL funkcija program_results; RLS: klijent svoj, tim svaki). */
export function useProgramResults(programId: string | undefined) {
  return useQuery({
    queryKey: ['program-results', programId],
    enabled: !!programId,
    queryFn: async (): Promise<ProgramResults | null> => {
      const { data, error } = await supabase.rpc('program_results', { p_program_id: programId! })
      if (error) throw error
      return (data as unknown as ProgramResults | null) ?? null
    },
  })
}

/** Završni izveštaj: klijent vidi samo objavljen, tim i nacrt. */
export function useProgramReport(programId: string | undefined) {
  return useQuery({
    queryKey: ['program-report', programId],
    enabled: !!programId,
    queryFn: async (): Promise<ProgramReport | null> => {
      const { data, error } = await supabase
        .from('program_reports')
        .select(
          'id, program_id, nutrition_note, training_note, recommendation, pdf_path, published_at',
        )
        .eq('program_id', programId!)
        .maybeSingle()
      if (error) throw error
      return (data as ProgramReport | null) ?? null
    },
  })
}

/** Preuzimanje PDF-a: kratkotrajan potpisan link na privatni bucket `reports`. */
export async function openReportPdf(path: string): Promise<void> {
  const { data, error } = await supabase.storage.from('reports').createSignedUrl(path, 60)
  if (error || !data) throw error ?? new Error('Izveštaj nije dostupan')
  window.open(data.signedUrl, '_blank', 'noopener')
}

export function useRenewProgram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { program_id: string; option: 'continue' | 'nutrition_only' }) =>
      invokeFunction<{ program_id: string; existing: boolean }>('renew-program', v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program'] }),
  })
}

// ===================== TIM =====================
export function usePublishReport(programId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      nutrition_note: string
      training_note: string
      recommendation: Recommendation | null
    }) =>
      invokeFunction<{ pdf_path: string; first_publish: boolean }>('publish-report', {
        program_id: programId,
        ...v,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['program-report', programId] })
      void qc.invalidateQueries({ queryKey: ['team-notifications'] })
    },
  })
}

/** Nacrt izveštaja: tim ga upisuje direktno (RLS „izveštaj: tim“), klijent ga ne vidi dok nije objavljen. */
export function useSaveReportDraft(programId: string | undefined, authorId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: {
      nutrition_note: string
      training_note: string
      recommendation: Recommendation | null
    }) => {
      const { error } = await supabase.from('program_reports').upsert(
        {
          program_id: programId!,
          author_id: authorId,
          ...v,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'program_id' },
      )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program-report', programId] }),
  })
}
