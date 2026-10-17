/**
 * Jedan krug razgovora sa asistentom, nezavisno od provajdera i od baze: model → alati → odgovor,
 * pa provera pravila (jedan ponovni pokušaj, inače bezbedan šablon) i obavezna eskalacija kod ozbiljnih
 * simptoma. Koriste ga Edge Function `assistant` i eval skripta (scripts/ai-eval.ts), pa se testira isto.
 */
import {
  assistantTools,
  escalateArgs,
  mealSwapArgs,
  pickAction,
  type ProposedAction,
  workoutSwapArgs,
} from './assistantPrompt.ts'
import { FALLBACK_REPLY, findRedFlag, findReplyViolation, withDoctorAdvice } from './assistantRules.ts'
import type { ChatMessage, Completion, ToolDef } from './llmTypes.ts'
import { findMealRuleViolation } from './mealRules.ts'

export type Completer = (messages: ChatMessage[], tools: ToolDef[]) => Promise<Completion>

export type Outcome = 'ok' | 'retried' | 'fallback' | 'error'

export type AssistantTurn = {
  reply: string
  action: ProposedAction | null
  outcome: Outcome
  calls: number
  inputTokens: number
  outputTokens: number
  /** Šta je model sam uradio, pre zaštitnog sloja (za eval modela). */
  model: { reply: string; violation: string | null; tools: string[]; error: string | null }
}

const MAX_CALLS = 3

/** Proverava argumente alata i beleži predlog; modelu vraća kratak rezultat (ili grešku da ispravi). */
export function runTool(
  name: string,
  rawArgs: string,
  withTraining: boolean,
  actions: ProposedAction[],
): string {
  let args: unknown
  try {
    args = JSON.parse(rawArgs || '{}')
  } catch {
    return 'Greška: argumenti nisu ispravan JSON.'
  }
  if (name === 'propose_meal_swap') {
    const parsed = mealSwapArgs.safeParse(args)
    if (!parsed.success) return 'Greška: plan_day 1–14, slot i new_title su obavezni.'
    const violation = findMealRuleViolation(parsed.data.new_title)
    if (violation) return `Greška: ${violation}. Naziv obroka bez količina.`
    actions.push({
      type: 'meal_swap',
      plan_day: parsed.data.plan_day,
      slot: parsed.data.slot,
      title: parsed.data.new_title,
      reason: parsed.data.reason,
    })
    return 'Predlog je poslat Olgici. Važi tek kad ga potvrdi.'
  }
  if (name === 'propose_workout_swap' && withTraining) {
    const parsed = workoutSwapArgs.safeParse(args)
    if (!parsed.success) return 'Greška: exercise i replacement su obavezni.'
    actions.push({ type: 'workout_swap', ...parsed.data })
    return 'Predlog je poslat Ognjenu. Važi tek kad ga potvrdi.'
  }
  if (name === 'escalate_to_team') {
    const parsed = escalateArgs.safeParse(args)
    if (!parsed.success) return 'Greška: reason je obavezan.'
    actions.push({ type: 'escalation', ...parsed.data })
    return 'Poruka je prosleđena timu.'
  }
  return `Greška: alat ${name} ne postoji.`
}

export async function runAssistantTurn(input: {
  complete: Completer
  system: string
  history: ChatMessage[]
  question: string
  withTraining: boolean
}): Promise<AssistantTurn> {
  const { complete, question, withTraining } = input
  const tools = assistantTools(withTraining)
  const actions: ProposedAction[] = []
  const usage = { calls: 0, input: 0, output: 0 }
  const model = { reply: '', violation: null as string | null, tools: [] as string[], error: null as string | null }
  let outcome: Outcome = 'ok'
  let reply = ''

  const call = async (messages: ChatMessage[], offered: ToolDef[]) => {
    usage.calls++
    const result = await complete(messages, offered)
    usage.input += result.inputTokens
    usage.output += result.outputTokens
    return result
  }

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: input.system },
      ...input.history,
      { role: 'user', content: question },
    ]
    // model može da pozove alat, pa dobije rezultat i tek onda napiše odgovor
    while (usage.calls < MAX_CALLS) {
      const result = await call(messages, tools)
      reply = result.content
      if (result.toolCalls.length === 0) break
      messages.push({ role: 'assistant', content: result.content || null, tool_calls: result.toolCalls })
      for (const toolCall of result.toolCalls) {
        model.tools.push(toolCall.function.name)
        const text = runTool(toolCall.function.name, toolCall.function.arguments, withTraining, actions)
        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: text })
      }
    }
    model.reply = reply
    model.violation = reply ? findReplyViolation(reply) : 'Prazan odgovor'

    // jedan ponovni pokušaj ako odgovor krši pravila (ili ga nema), pa bezbedan šablon
    if (model.violation) {
      outcome = 'retried'
      const retry = await call(
        [
          ...messages,
          { role: 'assistant', content: reply || '(bez odgovora)' },
          {
            role: 'user',
            content: `Tvoj odgovor krši pravilo (${model.violation}). Napiši ga ponovo, kratko, latinicom, bez brojeva kalorija, grama i vaganja.`,
          },
        ],
        [],
      )
      reply = retry.content
      if (!reply || findReplyViolation(reply)) {
        outcome = 'fallback'
        reply = FALLBACK_REPLY
        actions.push({ type: 'escalation', reason: 'Asistent nije dao ispravan odgovor', urgency: 'normal' })
      }
    }
  } catch (error) {
    model.error = (error as Error).message
    outcome = 'error'
    reply = FALLBACK_REPLY
    actions.push({ type: 'escalation', reason: 'Asistent trenutno nije dostupan', urgency: 'normal' })
  }

  // ozbiljan simptom: uvek savet za lekara i eskalacija, bez obzira na to šta je model uradio
  const redFlag = findRedFlag(question)
  if (redFlag) {
    reply = withDoctorAdvice(reply)
    if (!actions.some((a) => a.type === 'escalation' && a.urgency === 'high')) {
      actions.push({ type: 'escalation', reason: redFlag, urgency: 'high' })
    }
  }

  return {
    reply,
    action: pickAction(actions),
    outcome,
    calls: Math.max(usage.calls, 1),
    inputTokens: usage.input,
    outputTokens: usage.output,
    model,
  }
}
