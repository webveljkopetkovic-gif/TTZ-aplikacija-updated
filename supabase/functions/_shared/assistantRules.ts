/**
 * Zaštitna pravila AI asistenta (PLAN.md 4.6), nezavisna od modela: proverava ih server posle svakog
 * odgovora, jer jeftiniji modeli češće „probiju“ uputstva iz system prompta. Bez zavisnosti.
 */

/** Ozbiljni simptomi: asistent uvek savetuje lekara i eskalira timu, bez obzira na model. */
const RED_FLAGS: readonly { pattern: RegExp; reason: string }[] = [
  { pattern: /bol\w*\s+(me\s+)?(u\s+)?grudi|grudi\w*\s+(me\s+)?bol|stezanj\w*\s+u\s+grudima|probad\w*\s+u\s+grudima/iu, reason: 'Bol u grudima' },
  { pattern: /nesvest|onesvest|izgubi\w*\s+svest|pada\w*\s+u\s+nesvest|vrti\s+mi\s+se\s+u\s+glavi\s+i\s+pad/iu, reason: 'Nesvestica' },
  {
    // ne „krvna slika“ ni „krvni pritisak“: samo krv koja se vidi
    pattern: /krvari|krvav|krv\w*\s+u\s+(stolici|mokraći|urinu|povraćanju|ispljuvku)|krv\s+iz|(kašlje|kašljem|povraća|povraćam|pljujem)\w*\s+krv/iu,
    reason: 'Krvarenje',
  },
  { pattern: /jak\w*\s+bol|nepodnošljiv\w*\s+bol|užasn\w*\s+bol|strašn\w*\s+bol/iu, reason: 'Jak bol' },
  { pattern: /trudn/iu, reason: 'Trudnoća' },
  {
    pattern: /alergijsk\w*\s+reakcij|otekl\w*\s+(su\s+|je\s+)?(mi\s+)?(lice|usne|usta|jezik|grlo)|(lice|usne|jezik|grlo)\s+(mi\s+)?(je\s+|su\s+)?(mi\s+)?otek|otiče\s+(mi\s+)?(lice|grlo|jezik)|osip\s+po\s+celom/iu,
    reason: 'Alergijska reakcija',
  },
  { pattern: /ne\s+mogu\s+da\s+dišem|otežano\s+dis|guši\s+me|gušim\s+se|nedostaje\s+mi\s+vazduh/iu, reason: 'Otežano disanje' },
]

/** Razlog za eskalaciju ako pitanje klijenta pominje ozbiljan simptom, inače null. */
export function findRedFlag(text: string): string | null {
  for (const flag of RED_FLAGS) if (flag.pattern.test(text)) return flag.reason
  return null
}

/**
 * Šta odgovor asistenta ne sme da sadrži. Za razliku od pravila za obroke (mealRules.ts), reč „kalorije“
 * je dozvoljena („ne brojimo kalorije“); zabranjeni su brojevi uz kalorije i grame i uputstva za vaganje.
 */
const REPLY_FORBIDDEN: readonly { pattern: RegExp; message: string }[] = [
  { pattern: /\d+\s*(kcal|kalorij\w*|cal\b|kj\b)/iu, message: 'Broj kalorija' },
  { pattern: /\d+[.,]?\d*\s*(g|gr|grama?|grams?|dag|dkg|mg|ml)(?![\p{L}\d])/iu, message: 'Grami i mere' },
  { pattern: /\b(iz)?vagaj\w*|\bodmeri\w*|\bizvaga\w*|izmeri\w*\s+porcij/iu, message: 'Vaganje hrane' },
  { pattern: /\p{Script=Cyrillic}/u, message: 'Ćirilica umesto latinice' },
]

/** Prva povreda pravila u odgovoru asistenta ili null. */
export function findReplyViolation(text: string): string | null {
  for (const rule of REPLY_FORBIDDEN) if (rule.pattern.test(text)) return rule.message
  return null
}

const MENTIONS_DOCTOR = /lekar|doktor|hitn|\b194\b|\b112\b/iu

export const DOCTOR_ADVICE =
  'Ovo je simptom koji treba odmah da pogleda lekar: javi se svom lekaru ili pozovi hitnu pomoć (194). Prosledili smo poruku timu.'

/** Kod ozbiljnog simptoma odgovor mora da uputi na lekara; ako model to nije uradio, dodaje se savet. */
export function withDoctorAdvice(reply: string): string {
  return MENTIONS_DOCTOR.test(reply) ? reply : `${DOCTOR_ADVICE}\n\n${reply}`.trim()
}

/** Bezbedan odgovor kad model ne odgovori ili dvaput prekrši pravila. */
export const FALLBACK_REPLY =
  'Na ovo pitanje sada ne mogu da odgovorim kako treba, pa sam ga prosledio timu. Odgovor stiže porukom u aplikaciji.'

/** Odgovor kad je dnevni limit pitanja potrošen. */
export const LIMIT_REPLY = 'Za danas je to bilo dovoljno pitanja. Nastavljamo sutra, a hitne stvari piši timu.'
