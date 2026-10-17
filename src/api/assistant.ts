import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProposedAction } from '@/lib/assistantPrompt'
import { invokeFunction } from './functions'

export type ReviewResult = 'approved' | 'edited' | 'rejected'

export type ChatMessage = {
  id: string
  sender: 'client' | 'assistant' | 'team'
  body: string
  proposed_action: (ProposedAction & { applied_cycle?: number }) | null
  needs_team_review: boolean
  review_result: ReviewResult | null
  created_at: string
}

const MESSAGE_FIELDS = 'id, sender, body, proposed_action, needs_team_review, review_result, created_at'

// ===================== KLIJENT =====================
/** Pitanja klijenta, odgovori asistenta i poruke tima (RLS pušta samo svoje). */
export function useMyMessages(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-messages', userId],
    enabled: !!userId,
    // tim potvrđuje predloge u toku dana, pa se oznake osvežavaju same
    refetchInterval: 60_000,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select(MESSAGE_FIELDS)
        .eq('client_id', userId!)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return ((data ?? []) as unknown as ChatMessage[]).reverse()
    },
  })
}

export function useAskAssistant(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      invokeFunction<{ messages: ChatMessage[]; remaining: number }>('assistant', { body }),
    onSuccess: (result) => {
      qc.setQueryData<ChatMessage[]>(['my-messages', userId], (old) => [
        ...(old ?? []),
        ...result.messages,
      ])
    },
  })
}

// ===================== TIM =====================
export type TeamProposal = ChatMessage & {
  client_id: string
  program_id: string | null
  reviewed_at: string | null
  profiles: { full_name: string | null } | null
  /** Pitanje klijenta na koje je asistent odgovorio. */
  question?: string
}

/** Predlozi i eskalacije asistenta: na čekanju i nedavno obrađeni, uz pitanje klijenta. */
export function useTeamProposals() {
  return useQuery({
    queryKey: ['team-proposals'],
    refetchInterval: 60_000,
    queryFn: async (): Promise<TeamProposal[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select(
          `${MESSAGE_FIELDS}, client_id, program_id, reviewed_at,
           profiles!messages_client_id_fkey ( full_name )`,
        )
        .eq('needs_team_review', true)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      const proposals = (data ?? []) as unknown as TeamProposal[]
      if (proposals.length === 0) return proposals

      const clients = [...new Set(proposals.map((p) => p.client_id))]
      const oldest = proposals.at(-1)!.created_at
      const { data: questions, error: qError } = await supabase
        .from('messages')
        .select('client_id, body, created_at')
        .in('client_id', clients)
        .eq('sender', 'client')
        .gte('created_at', new Date(new Date(oldest).getTime() - 86_400_000).toISOString())
        .order('created_at', { ascending: false })
      if (qError) throw qError
      return proposals.map((p) => ({
        ...p,
        question: (questions ?? []).find(
          (q) => q.client_id === p.client_id && q.created_at <= p.created_at,
        )?.body,
      }))
    },
  })
}

export function useReviewProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: {
      id: string
      result: ReviewResult
      title?: string
      note?: string
    }) => {
      const { error } = await supabase.rpc('review_assistant_proposal', {
        p_message_id: v.id,
        p_result: v.result,
        p_title: v.title ?? undefined,
        p_note: v.note ?? undefined,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['team-proposals'] })
      void qc.invalidateQueries({ queryKey: ['team-overview'] })
    },
  })
}
