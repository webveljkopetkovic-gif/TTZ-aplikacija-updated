/** Interfejs za naplatu (PLAN.md 7.1). Prvi provider je `manual`, procesor kartica se dodaje kao drugi. */

export interface CheckoutInput {
  paymentId: string
  programId: string
  amountRsd: number
  customerEmail: string
}

export interface PaymentInstructions {
  amountRsd: number
  /** Poziv na broj, isti kao `payments.provider_ref`. */
  reference: string
  note: string
}

export interface CheckoutResult {
  provider: string
  /** Jedinstven `payments.provider_ref`: obezbeđuje idempotentnost webhook-a. */
  reference: string
  instructions?: PaymentInstructions
  /** Za procesore sa preusmeravanjem na stranicu za plaćanje. */
  redirectUrl?: string
}

export interface WebhookEvent {
  reference: string
  status: 'paid' | 'failed'
}

export interface PaymentProvider {
  readonly name: string
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>
  /** Proverava potpis zahteva procesora i vraća događaj. Baca grešku ako zahtev nije verodostojan. */
  verifyWebhook(req: Request): Promise<WebhookEvent>
}
