import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useRequestPasswordReset } from '@/api/auth'
import { AuthLayout } from '@/components/AuthLayout'
import { Button, Input } from '@/components/ui'
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/authSchema'

export default function ForgotPassword() {
  const reset = useRequestPasswordReset()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) })

  return (
    <AuthLayout title="Zaboravljena" accent="lozinka" subtitle="Pošaljemo ti link za novu lozinku.">
      {reset.isSuccess ? (
        // Isti odgovor bez obzira da li nalog postoji, da se ne otkriva ko ima nalog
        <p role="status" className="rounded-card bg-card p-5 font-semibold">
          Ako nalog postoji, link za novu lozinku je poslat na tvoj email.
        </p>
      ) : (
        <form
          noValidate
          onSubmit={handleSubmit((values) => reset.mutate(values.email))}
          className="flex flex-col gap-5"
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={
              errors.email?.message ??
              (reset.isError ? 'Slanje nije uspelo. Pokušaj ponovo.' : undefined)
            }
            {...register('email')}
          />
          <Button type="submit" block disabled={reset.isPending}>
            {reset.isPending ? 'Slanje…' : 'Pošalji link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
