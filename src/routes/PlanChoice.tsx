import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { ApiError } from '@/api/functions'
import { useCheckout } from '@/api/checkout'
import { formatRsd, useProducts, type Product } from '@/api/products'
import { AuthLayout } from '@/components/AuthLayout'
import { FieldError } from '@/components/form'
import { Button, Checkbox, Input } from '@/components/ui'
import { cn } from '@/lib/cn'
import { clearPending, loadPending } from '@/lib/intakeDraft'

const DESCRIPTIONS: Record<Product['kind'], string> = {
  nutrition: 'Plan ishrane 14 dana, protokol suplemenata, pregled nalaza, pitanja.',
  nutrition_training: 'Sve iz osnovnog plana i Ognjenove video vežbe za tvoj nivo.',
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const schema = z.object({
  email: z.string().trim().min(1, 'Unesi email iz ankete').pipe(z.email('Unesi ispravan email')),
  productId: z.string().optional(),
  password: z.string().min(8, 'Lozinka ima najmanje 8 znakova').max(72, 'Najviše 72 znaka'),
  consent: z.boolean().refine((v) => v, { error: 'Saglasnost je obavezna' }),
})
type Values = z.input<typeof schema>

export default function PlanChoice() {
  const [params] = useSearchParams()
  const intakeId = params.get('intake') ?? ''
  if (!UUID.test(intakeId)) return <Navigate to="/anketa/1" replace />
  return <PlanForm intakeId={intakeId} />
}

function PlanForm({ intakeId }: { intakeId: string }) {
  const navigate = useNavigate()
  const products = useProducts()
  const checkout = useCheckout()
  const pending = loadPending(intakeId)
  const [serverError, setServerError] = useState<string>()
  const [accountExists, setAccountExists] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: pending?.email ?? '', productId: '', password: '', consent: false },
  })

  // preporuka (plan sa vežbama) je unapred izabran čim se planovi učitaju
  const list = products.data ?? []
  const recommended = list.find((p) => p.kind === 'nutrition_training')
  const chosen = useWatch({ control, name: 'productId' })
  const selected = chosen || recommended?.id || list[0]?.id || ''

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined)
    setAccountExists(false)
    try {
      await checkout.mutateAsync({
        intakeId,
        email: values.email,
        password: values.password,
        productId: selected,
      })
      clearPending()
      navigate('/app', { replace: true })
    } catch (error) {
      setAccountExists(error instanceof ApiError && error.status === 409)
      setServerError(
        error instanceof ApiError ? error.message : 'Plaćanje nije uspelo. Pokušaj ponovo.',
      )
    }
  })

  return (
    <AuthLayout
      title="Anketa je poslata."
      accent="Izaberi plan."
      subtitle="Tim pravi tvoj plan čim uplata prođe."
      backTo="/anketa/5"
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-1 flex-col gap-6">
        <div role="radiogroup" aria-label="Plan" className="flex flex-col gap-4">
          {products.isPending && <p className="text-muted">Učitavanje planova…</p>}
          {products.isError && (
            <p role="alert" className="font-semibold text-danger">
              Planovi se nisu učitali. Osveži stranicu.
            </p>
          )}
          {list.map((p) => {
            const isSelected = selected === p.id
            const isRecommended = p.kind === 'nutrition_training'
            return (
              <label
                key={p.id}
                className={cn(
                  'relative block cursor-pointer rounded-card border-2 bg-card p-5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                  isSelected ? 'border-chart' : 'border-line',
                )}
              >
                <input
                  type="radio"
                  name="plan"
                  value={p.id}
                  checked={isSelected}
                  onChange={() => setValue('productId', p.id)}
                  className="sr-only"
                />
                {isRecommended && (
                  <span className="absolute -top-3 right-5 rounded-full bg-brand px-3 py-1 text-xs font-extrabold uppercase">
                    Preporuka
                  </span>
                )}
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-lg font-extrabold leading-snug">{p.name}</span>
                  <span className="shrink-0 text-lg font-extrabold text-brand-text">
                    {formatRsd(p.price_rsd)}
                  </span>
                </span>
                <span className="mt-2 block text-muted">{DESCRIPTIONS[p.kind]}</span>
              </label>
            )
          })}
        </div>

        {!pending && (
          <Input
            label="Email iz ankete"
            required
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
        )}

        <div>
          <Input
            label="Lozinka za aplikaciju"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          {pending && <p className="mt-2 text-sm text-muted">Nalog se pravi na {pending.email}</p>}
        </div>

        <div>
          <Checkbox
            aria-describedby={errors.consent ? 'consent-error' : undefined}
            {...register('consent')}
          >
            Saglasan/na sam da tim vidi moje zdravstvene podatke i nalaze i da mi šalje poruke na
            WhatsApp i email.
          </Checkbox>
          <FieldError id="consent-error" message={errors.consent?.message} />
        </div>

        {serverError && (
          <div
            role="alert"
            className="rounded-card border border-danger p-4 font-semibold text-danger"
          >
            {serverError}{' '}
            {accountExists && (
              <Link to="/prijava" className="underline">
                Prijavi se
              </Link>
            )}
          </div>
        )}

        <div className="mt-auto pt-4">
          <Button
            type="submit"
            block
            disabled={checkout.isPending || products.isPending}
            className="min-h-[56px] text-lg font-extrabold"
          >
            {checkout.isPending ? 'Pravimo nalog…' : 'Plati i aktiviraj plan'}
          </Button>
          <p className="mt-4 text-center text-sm text-muted">
            Uplata na račun · plan se pravi čim uplata bude potvrđena
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
