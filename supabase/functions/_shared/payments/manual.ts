import type { CheckoutInput, CheckoutResult, PaymentProvider, WebhookEvent } from './types.ts'

/**
 * Ručna uplata na račun: klijent dobija iznos i poziv na broj, a admin u /tim/uplate klikne „Uplata primljena“.
 * Primalac i broj računa su u tabeli app_settings (ključ `manual_payment`), da ih admin menja bez izmene koda.
 */
export const manualProvider: PaymentProvider = {
  name: 'manual',

  createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const reference = `TTZ-${input.paymentId.replaceAll('-', '').slice(0, 8).toUpperCase()}`
    return Promise.resolve({
      provider: 'manual',
      reference,
      instructions: {
        amountRsd: input.amountRsd,
        reference,
        note: 'Plan počinje da se pravi čim uplata bude potvrđena.',
      },
    })
  },

  verifyWebhook(): Promise<WebhookEvent> {
    return Promise.reject(new Error('Ručna uplata nema webhook'))
  },
}
