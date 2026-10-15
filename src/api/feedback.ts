import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { FeedbackAnswers, StoredAnswers } from '@/lib/feedbackSchema'
import { invokeFunction } from './functions'

export type FeedbackReply = {
  id: string
  body: string
  sent_at: string | null
  created_at: string
  sent_channels: string[]
}

export type FeedbackRecord = {
  id: string
  due_day: number
  due_date: string
  status: string
  submitted_at: string | null
  answers: StoredAnswers | null
  feedback_replies: FeedbackReply[]
}

// ===================== KLIJENT =====================
/** Svi feedbacki programa (10, 20, 30) sa odgovorima tima; RLS pušta samo svoje. */
export function useMyFeedbacks(programId: string | undefined) {
  return useQuery({
    queryKey: ['my-feedbacks', programId],
    enabled: !!programId,
    queryFn: async (): Promise<FeedbackRecord[]> => {
      const { data, error } = await supabase
        .from('feedbacks')
        .select(
          'id, due_day, due_date, status, submitted_at, answers, feedback_replies ( id, body, sent_at, created_at, sent_channels )',
        )
        .eq('program_id', programId!)
        .order('due_day')
      if (error) throw error
      return (data ?? []) as unknown as FeedbackRecord[]
    },
  })
}

export function useSubmitFeedback(programId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { feedback_id: string; answers: FeedbackAnswers }) =>
      invokeFunction<{ status: string }>('submit-feedback', v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-feedbacks', programId] })
      void qc.invalidateQueries({ queryKey: ['my-measurements', programId] })
    },
  })
}

// ===================== TIM =====================
export type TeamFeedbackRow = FeedbackRecord & {
  program_id: string
  programs: {
    id: string
    client_id: string
    plan_focus: string | null
    products: { kind: string } | null
    profiles: { full_name: string | null } | null
  }
}

/** Feedbacki koje tim pregleda: poslati, odgovoreni i zakasneli (sa prethodnim za poređenje u listi). */
export function useTeamFeedbacks() {
  return useQuery({
    queryKey: ['team-feedbacks'],
    refetchInterval: 60_000,
    queryFn: async (): Promise<TeamFeedbackRow[]> => {
      const { data, error } = await supabase
        .from('feedbacks')
        .select(
          `id, program_id, due_day, due_date, status, submitted_at, answers,
           feedback_replies ( id, body, sent_at, created_at, sent_channels ),
           programs!inner ( id, client_id, plan_focus, products ( kind ),
             profiles!programs_client_id_fkey ( full_name ) )`,
        )
        .in('status', ['submitted', 'answered', 'late', 'open'])
        .order('submitted_at', { ascending: true, nullsFirst: false })
      if (error) throw error
      return (data ?? []) as unknown as TeamFeedbackRow[]
    },
  })
}

export function useTeamReply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { feedback_id: string; body: string; channels: ('whatsapp' | 'email')[] }) =>
      invokeFunction<{ reply_id: string }>('team-reply', v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['team-feedbacks'] })
      void qc.invalidateQueries({ queryKey: ['team-overview'] })
      void qc.invalidateQueries({ queryKey: ['team-notifications'] })
    },
  })
}

export type NotificationRow = {
  id: string
  client_id: string
  kind: string
  channel: string
  status: string
  error: string | null
  attempts: number
  scheduled_for: string
  sent_at: string | null
  profiles: { full_name: string | null } | null
}

export function useTeamNotifications() {
  return useQuery({
    queryKey: ['team-notifications'],
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select(
          'id, client_id, kind, channel, status, error, attempts, scheduled_for, sent_at, profiles!notifications_client_id_fkey ( full_name )',
        )
        .order('scheduled_for', { ascending: false })
        .limit(200)
      if (error) throw error
      return (data ?? []) as unknown as NotificationRow[]
    },
  })
}

export function useRetryNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invokeFunction('send-notification', { retry_id: id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-notifications'] }),
  })
}
