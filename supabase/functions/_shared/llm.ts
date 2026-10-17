/**
 * Tanak klijent za OpenAI-kompatibilan Chat Completions API (Qwen, Mistral, OpenAI, Gemini, EU hostovi…).
 * Provajder se bira samo kroz secrets: AI_BASE_URL, AI_API_KEY, AI_MODEL. Bez SDK-a, da kod ne zavisi od
 * jednog provajdera. AI_DRY_RUN=true vraća predvidive lažne odgovore (lokalni razvoj i testovi).
 */

import type { ChatMessage, Completion, ToolCall, ToolDef } from './llmTypes.ts'

export type { ChatMessage, Completion, ToolCall, ToolDef }

export type LlmConfig = {
  baseUrl: string
  apiKey: string
  model: string
  dryRun: boolean
  timeoutMs: number
}

export class LlmError extends Error {}

export function llmConfig(): LlmConfig {
  const env = (name: string) => Deno.env.get(name) ?? ''
  return {
    baseUrl: env('AI_BASE_URL').replace(/\/$/, ''),
    apiKey: env('AI_API_KEY'),
    model: env('AI_MODEL') || 'dry-run',
    dryRun: env('AI_DRY_RUN') === 'true',
    timeoutMs: Number(env('AI_TIMEOUT_MS')) || 30_000,
  }
}

/** Jedan poziv modela. Greške mreže, statusa i formata se pretvaraju u LlmError. */
export async function complete(
  config: LlmConfig,
  messages: ChatMessage[],
  tools: ToolDef[],
): Promise<Completion> {
  if (config.dryRun) return dryRunCompletion(messages, tools)
  if (!config.baseUrl || !config.apiKey) throw new LlmError('AI_BASE_URL i AI_API_KEY nisu postavljeni')

  let res: Response
  try {
    res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages,
        ...(tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
        temperature: 0.3,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    })
  } catch (error) {
    throw new LlmError(`Model nije dostupan: ${(error as Error).message}`)
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300)
    throw new LlmError(`Model je vratio ${res.status}: ${detail}`)
  }

  const data = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  } | null
  const message = data?.choices?.[0]?.message
  if (!message) throw new LlmError('Model je vratio prazan odgovor')
  return {
    content: (message.content ?? '').trim(),
    toolCalls: message.tool_calls ?? [],
    inputTokens: data?.usage?.prompt_tokens ?? 0,
    outputTokens: data?.usage?.completion_tokens ?? 0,
  }
}

/**
 * Lažni model za AI_DRY_RUN: „ne volim“ / „zamena obroka“ → propose_meal_swap, „smeta“ / „vežba“ →
 * propose_workout_swap (ako je alat ponuđen), inače kratak odgovor. Posle rezultata alata vraća tekst.
 */
function dryRunCompletion(messages: ChatMessage[], tools: ToolDef[]): Completion {
  const usage = { inputTokens: 0, outputTokens: 0 }
  const last = messages.at(-1)
  if (last?.role === 'tool') {
    return { ...usage, toolCalls: [], content: 'Predlog sam poslao timu. Važi tek kad ga tim potvrdi.' }
  }
  const question = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  const offered = new Set(tools.map((t) => t.function.name))
  const call = (name: string, args: Record<string, unknown>): Completion => ({
    ...usage,
    content: '',
    toolCalls: [{ id: `dry-${name}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
  })

  const planDay = Number(/plan_dan_danas:\s*(\d+)/u.exec(String(messages[0]?.content ?? ''))?.[1] ?? 1)
  if (/ne volim|zamen\w* obrok/iu.test(question) && offered.has('propose_meal_swap')) {
    return call('propose_meal_swap', {
      plan_day: planDay,
      slot: 'lunch',
      new_title: 'Ćuretina sa povrćem',
      reason: 'Klijent ne voli obrok iz plana',
    })
  }
  if (/smeta|vežb\w* ne prija|koleno|kolenu/iu.test(question) && offered.has('propose_workout_swap')) {
    return call('propose_workout_swap', {
      exercise: 'Čučanj',
      replacement: 'Glute bridge',
      reason: 'Smeta kolenu',
    })
  }
  return { ...usage, toolCalls: [], content: 'Ovo je test odgovor asistenta.' }
}
