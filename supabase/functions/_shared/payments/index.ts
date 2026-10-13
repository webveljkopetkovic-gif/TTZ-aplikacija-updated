import { manualProvider } from './manual.ts'
import type { PaymentProvider } from './types.ts'

export type { PaymentInstructions, PaymentProvider, WebhookEvent } from './types.ts'

// Ovde se dodaje procesor kartica (Monri, AllSecure, NestPay…) kad bude ugovoren.
const providers: Record<string, PaymentProvider> = {
  manual: manualProvider,
}

export function getProvider(name: string): PaymentProvider | null {
  return providers[name] ?? null
}

export const defaultProvider = manualProvider
