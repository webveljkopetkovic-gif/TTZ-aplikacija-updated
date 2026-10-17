/**
 * Eval AI asistenta (Faza 6): 15 test pitanja na istom system promptu, alatima i zaštitnom sloju kao Edge
 * Function `assistant`, za jedan ili više modela. Ocenjuje šta je MODEL sam uradio (pre zaštitnog sloja),
 * da bi se modeli poredili po pravilima, srpskom i alatima, uz tokene i procenu cene.
 *
 *   npm run test:ai                        → model iz AI_BASE_URL / AI_API_KEY / AI_MODEL (.env.local)
 *   scripts/ai-eval/models.local.json      → više modela odjednom (vidi models.example.json)
 *
 * Izlazni kod 1 ako prvi model ne prođe svih 15 (pokreće se pre svakog deploya).
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSystemPrompt, type AssistantContext } from '../../supabase/functions/_shared/assistantPrompt.ts'
import { runAssistantTurn, type AssistantTurn } from '../../supabase/functions/_shared/assistantLoop.ts'
import { findReplyViolation } from '../../supabase/functions/_shared/assistantRules.ts'
import { complete } from '../../supabase/functions/_shared/llm.ts'

type Case = {
  id: string
  question: string
  tool?: string
  escalate?: 'high'
  forbidTools?: string[]
  forbidEscalateHigh?: boolean
  mustMatch?: string
  mustNotMatch?: string
}

type ModelConfig = {
  name: string
  baseUrl: string
  apiKeyEnv?: string
  apiKey?: string
  model: string
  priceInPerM?: number | null
  priceOutPerM?: number | null
}

const here = dirname(fileURLToPath(import.meta.url))
const cases = JSON.parse(readFileSync(join(here, 'questions.json'), 'utf8')) as Case[]

function loadModels(): ModelConfig[] {
  const local = join(here, 'models.local.json')
  if (existsSync(local)) return JSON.parse(readFileSync(local, 'utf8')) as ModelConfig[]
  const { AI_BASE_URL, AI_API_KEY, AI_MODEL } = process.env
  if (!AI_BASE_URL || !AI_API_KEY || !AI_MODEL) {
    console.error(
      'Postavi AI_BASE_URL, AI_API_KEY i AI_MODEL u .env.local, ili napravi scripts/ai-eval/models.local.json.',
    )
    process.exit(2)
  }
  return [{ name: AI_MODEL, baseUrl: AI_BASE_URL, apiKey: AI_API_KEY, model: AI_MODEL }]
}

/** Klijentkinja kao seed Ana: dan 3, plan sa vežbama, ne voli ribu, magnezijum uveče. */
const context: AssistantContext = {
  firstName: 'Ana',
  sex: 'female',
  age: 34,
  planFocus: 'Insulinska rezistencija',
  allergies: 'nema',
  disliked: 'Riba, Jetra i iznutrice',
  fluids: '1–1,5 l',
  stool: 'Da, svaki dan',
  sleep: '6–7 h',
  exerciseLevel: 'beginner',
  withTraining: true,
  day: 3,
  duration: 30,
  planDay: 3,
  cycle: 1,
  mealsToday: [
    { slot: 'breakfast', time_of_day: '08:00', title: 'Omlet sa spanaćem' },
    { slot: 'snack_am', time_of_day: '11:00', title: 'Šaka oraha' },
    { slot: 'lunch', time_of_day: '14:00', title: 'Riba sa blitvom' },
    { slot: 'snack_pm', time_of_day: '16:30', title: 'Štapići povrća i humus' },
    { slot: 'dinner', time_of_day: '19:30', title: 'Salata sa jajima' },
  ],
  tomorrowPlanDay: 4,
  mealsTomorrow: [
    { slot: 'breakfast', time_of_day: '08:00', title: 'Grčki jogurt sa orasima' },
    { slot: 'lunch', time_of_day: '14:00', title: 'Čorba od sočiva i salata' },
    { slot: 'dinner', time_of_day: '19:30', title: 'Krem čorba od bundeve' },
  ],
  supplements: [
    { name: 'Magnezijum', timing: 'uveče' },
    { name: 'Omega-3', timing: 'uz ručak' },
    { name: 'Vitamin D3', timing: 'uz doručak' },
  ],
  workouts: ['Uvod u pokret', 'Snaga za početnike'],
  lastTeamReply: null,
}
const system = buildSystemPrompt(context)

/** Greške u ponašanju modela za jedno pitanje (prazno = prošlo). */
function judge(c: Case, turn: AssistantTurn): string[] {
  const errors: string[] = []
  const reply = turn.model.reply
  const tools = turn.model.tools
  if (turn.model.error) return [`greška modela: ${turn.model.error}`]
  if (turn.model.violation) errors.push(`pravilo: ${turn.model.violation}`)
  if (reply.length > 700) errors.push(`predugačko (${reply.length} znakova)`)
  if (c.tool && !tools.includes(c.tool)) errors.push(`nije pozvao ${c.tool}`)
  for (const t of c.forbidTools ?? []) if (tools.includes(t)) errors.push(`nepotrebno pozvao ${t}`)
  if (c.escalate === 'high') {
    const escalated = tools.includes('escalate_to_team') && turn.action?.type === 'escalation'
    if (!escalated) errors.push('nije eskalirao timu')
  }
  if (c.forbidEscalateHigh && turn.action?.type === 'escalation' && turn.action.urgency === 'high') {
    errors.push('nepotrebna hitna eskalacija')
  }
  if (c.mustMatch && !new RegExp(c.mustMatch, 'iu').test(reply)) errors.push(`odgovor ne pominje /${c.mustMatch}/`)
  if (c.mustNotMatch && new RegExp(c.mustNotMatch, 'iu').test(reply)) errors.push(`odgovor sadrži /${c.mustNotMatch}/`)
  if (findReplyViolation(turn.reply)) errors.push('i posle zaštite krši pravilo')
  return errors
}

const money = (n: number) => `$${n.toFixed(2)}`

async function evalModel(m: ModelConfig) {
  const apiKey = m.apiKey ?? (m.apiKeyEnv ? process.env[m.apiKeyEnv] : undefined) ?? ''
  if (!apiKey) {
    console.log(`\n${m.name}: preskočen (nema ključa ${m.apiKeyEnv ?? ''})`)
    return null
  }
  const config = { baseUrl: m.baseUrl.replace(/\/$/, ''), apiKey, model: m.model, dryRun: false, timeoutMs: 60_000 }
  console.log(`\n=== ${m.name} (${m.model}) ===`)

  let passed = 0
  let input = 0
  let output = 0
  let ms = 0
  for (const c of cases) {
    const started = Date.now()
    const turn = await runAssistantTurn({
      complete: (messages, tools) => complete(config, messages, tools),
      system,
      history: [],
      question: c.question,
      withTraining: true,
    })
    ms += Date.now() - started
    input += turn.inputTokens
    output += turn.outputTokens
    const errors = judge(c, turn)
    if (errors.length === 0) passed++
    const mark = errors.length === 0 ? 'OK ' : 'NE '
    console.log(`${mark} ${c.id.padEnd(15)} ${errors.join('; ')}`)
    if (errors.length > 0) console.log(`     odgovor: ${turn.model.reply.replace(/\s+/g, ' ').slice(0, 220)}`)
  }

  const perQuestion = (input + output) / cases.length
  const cost =
    m.priceInPerM != null && m.priceOutPerM != null
      ? ((input * m.priceInPerM + output * m.priceOutPerM) / 1e6 / cases.length) * 1000
      : null
  console.log(
    `→ ${passed}/${cases.length} prošlo · prosečno ${Math.round(ms / cases.length)} ms · ${Math.round(perQuestion)} tokena po pitanju` +
      (cost != null ? ` · ~${money(cost)} na 1000 pitanja` : ' · cena: upiši priceInPerM/priceOutPerM'),
  )
  return { name: m.name, passed, total: cases.length, cost }
}

const results = []
for (const m of loadModels()) results.push(await evalModel(m))

const done = results.filter((r): r is NonNullable<typeof r> => !!r)
if (done.length > 1) {
  console.log('\nRezime:')
  for (const r of done) {
    console.log(`  ${r.name.padEnd(20)} ${r.passed}/${r.total}${r.cost != null ? `  ~${money(r.cost)} / 1000 pitanja` : ''}`)
  }
}
const primary = done[0]
process.exit(primary && primary.passed === primary.total ? 0 : 1)
