// AI asistent (Faza 6, PLAN.md 4.6): klijent postavi pitanje, model odgovori odmah, a svaka izmena plana
// ide timu kao predlog (needs_team_review). Model je bilo koji OpenAI-kompatibilan API (AI_BASE_URL/AI_MODEL).
// Kontekst gradi server iz baze, nikad iz `team_notes`. Posle odgovora server proverava pravila domena.
import { z } from 'zod'
import { adminClient, callerOf, HttpError, json, serve } from '../_shared/http.ts'
import { type ChatMessage, complete, llmConfig } from '../_shared/llm.ts'
import { buildSystemPrompt, intakeForAssistant, mealsFor, type Slot } from '../_shared/assistantPrompt.ts'
import { runAssistantTurn } from '../_shared/assistantLoop.ts'
import { LIMIT_REPLY } from '../_shared/assistantRules.ts'
import { belgradeToday, planDayOn, programDayOn } from '../_shared/schedule.ts'

const body = z.object({ body: z.string().trim().min(1).max(1000) })

const HISTORY = 10

serve(async (req, raw) => {
  const parsed = body.safeParse(raw)
  if (!parsed.success) throw new HttpError('Napiši pitanje (do 1000 znakova)', 400)
  const question = parsed.data.body

  const admin = adminClient()
  const caller = await callerOf(admin, req)
  if (!caller) throw new HttpError('Potrebna je prijava', 401)
  if (caller.role !== 'client') throw new HttpError('Pitanja postavljaju klijenti', 403)

  const { data: program, error: programError } = await admin
    .from('programs')
    .select('id, status, activated_at, duration_days, exercise_level, plan_focus, intake_id, products ( kind )')
    .eq('client_id', caller.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (programError) throw programError
  if (!program || program.status !== 'active') {
    throw new HttpError('Asistent je dostupan dok traje program', 409)
  }

  const limit = Number(Deno.env.get('AI_DAILY_LIMIT')) || 30
  const { data: usedToday, error: countError } = await admin.rpc('client_messages_today', {
    p_client_id: caller.id,
  })
  if (countError) throw countError
  if ((usedToday ?? 0) >= limit) throw new HttpError(LIMIT_REPLY, 429)

  const { data: clientMessage, error: insertError } = await admin
    .from('messages')
    .insert({ client_id: caller.id, program_id: program.id, sender: 'client', body: question })
    .select('id, sender, body, proposed_action, needs_team_review, review_result, created_at')
    .single()
  if (insertError) throw insertError

  const withTraining = (program.products as unknown as { kind: string } | null)?.kind === 'nutrition_training'
  const system = await buildSystemPromptFor(admin, caller.id, program, withTraining)
  const history = await recentHistory(admin, caller.id, clientMessage.id)

  const config = llmConfig()
  const started = Date.now()
  const turn = await runAssistantTurn({
    complete: (messages, tools) => complete(config, messages, tools),
    system,
    history,
    question,
    withTraining,
  })
  if (turn.model.error) console.error('AI asistent', turn.model.error)
  const { data: assistantMessage, error: replyError } = await admin
    .from('messages')
    .insert({
      client_id: caller.id,
      program_id: program.id,
      sender: 'assistant',
      body: turn.reply,
      proposed_action: turn.action,
      needs_team_review: turn.action !== null,
    })
    .select('id, sender, body, proposed_action, needs_team_review, review_result, created_at')
    .single()
  if (replyError) throw replyError

  const { error: usageError } = await admin.from('ai_usage').insert({
    message_id: assistantMessage.id,
    client_id: caller.id,
    model: config.model,
    input_tokens: turn.inputTokens,
    output_tokens: turn.outputTokens,
    calls: turn.calls,
    latency_ms: Date.now() - started,
    outcome: turn.outcome,
  })
  if (usageError) console.error('ai_usage', usageError.message)

  return json({
    messages: [clientMessage, assistantMessage],
    remaining: Math.max(limit - (usedToday ?? 0) - 1, 0),
  })
})

type Admin = ReturnType<typeof adminClient>
type ProgramRow = {
  id: string
  activated_at: string | null
  duration_days: number
  exercise_level: string | null
  plan_focus: string | null
  intake_id: string | null
}

/** Kontekst iz baze: samo polja iz ANKETA.md sekcija 7, plan za danas i sutra, poslednji odgovor tima. */
async function buildSystemPromptFor(
  admin: Admin,
  clientId: string,
  program: ProgramRow,
  withTraining: boolean,
): Promise<string> {
  const today = belgradeToday()
  const day = programDayOn(program.activated_at, today)
  const now = planDayOn(day)
  const tomorrow = planDayOn(day + 1)

  const [profile, intake, meals, supplements, workouts, feedbackReply, teamMessage] = await Promise.all([
    admin.from('profiles').select('full_name').eq('id', clientId).maybeSingle(),
    program.intake_id
      ? admin.from('intake_surveys').select('sex, birth_date, answers').eq('id', program.intake_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    admin
      .from('program_meals')
      .select('plan_day, slot, time_of_day, title, valid_from_cycle')
      .eq('program_id', program.id),
    admin.from('supplements').select('name, timing').eq('program_id', program.id).eq('active', true).order('name'),
    withTraining && program.exercise_level
      ? admin.from('workouts').select('title').eq('level', program.exercise_level).order('sort_order')
      : Promise.resolve({ data: [], error: null }),
    admin
      .from('feedback_replies')
      .select('body, created_at, feedbacks!inner ( program_id )')
      .eq('feedbacks.program_id', program.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('messages')
      .select('body, created_at')
      .eq('client_id', clientId)
      .eq('sender', 'team')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  for (const r of [profile, intake, meals, supplements, workouts, feedbackReply, teamMessage]) {
    if (r.error) throw r.error
  }

  const lastTeam = [feedbackReply.data, teamMessage.data]
    .filter((r): r is { body: string; created_at: string } => !!r)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const allMeals = (meals.data ?? []) as {
    plan_day: number
    slot: Slot
    time_of_day: string
    title: string
    valid_from_cycle: number
  }[]

  return buildSystemPrompt({
    firstName: (profile.data?.full_name ?? '').trim().split(/\s+/)[0] || 'klijent',
    ...intakeForAssistant(intake.data as Parameters<typeof intakeForAssistant>[0], today),
    planFocus: program.plan_focus,
    exerciseLevel: program.exercise_level,
    withTraining,
    day,
    duration: program.duration_days,
    planDay: now.planDay,
    cycle: now.cycle,
    mealsToday: mealsFor(allMeals, now.planDay, now.cycle),
    tomorrowPlanDay: tomorrow.planDay,
    mealsTomorrow: mealsFor(allMeals, tomorrow.planDay, tomorrow.cycle),
    supplements: supplements.data ?? [],
    workouts: ((workouts.data ?? []) as { title: string }[]).map((w) => w.title),
    lastTeamReply: lastTeam?.body ?? null,
  })
}

/** Poslednjih nekoliko poruka (bez trenutnog pitanja), da asistent zna o čemu je bilo reči. */
async function recentHistory(admin: Admin, clientId: string, excludeId: string): Promise<ChatMessage[]> {
  const { data, error } = await admin
    .from('messages')
    .select('id, sender, body')
    .eq('client_id', clientId)
    .neq('id', excludeId)
    .order('created_at', { ascending: false })
    .limit(HISTORY)
  if (error) throw error
  return (data ?? []).reverse().map((m) =>
    m.sender === 'client'
      ? { role: 'user' as const, content: m.body }
      : { role: 'assistant' as const, content: m.sender === 'team' ? `(Poruka tima) ${m.body}` : m.body },
  )
}
