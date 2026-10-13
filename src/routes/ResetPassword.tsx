import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate } from 'react-router-dom'
import { useProfile, useSession, useUpdatePassword } from '@/api/auth'
import { AuthLayout } from '@/components/AuthLayout'
import { Button, Input } from '@/components/ui'
import { newPasswordSchema, type NewPasswordValues } from '@/lib/authSchema'
import { homeForRole } from '@/lib/roles'

/** Otvara se iz linka u emailu: Supabase tada već pravi privremenu sesiju za izmenu lozinke. */
export default function ResetPassword() {
  const session = useSession()
  const profile = useProfile(session.data?.user.id)
  const update = useUpdatePassword()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema) })

  if (update.isSuccess && profile.data) {
    return <Navigate to={homeForRole(profile.data.role)} replace />
  }

  if (!session.isPending && !session.data) {
    return (
      <AuthLayout title="Link je" accent="istekao">
        <p className="mb-6 text-muted">Zatraži novi link za promenu lozinke.</p>
        <Link
          to="/zaboravljena-lozinka"
          className="inline-flex min-h-btn items-center justify-center rounded-full bg-brand px-6 font-bold"
        >
          Pošalji novi link
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Nova" accent="lozinka">
      <form
        noValidate
        onSubmit={handleSubmit((values) => update.mutate(values.password))}
        className="flex flex-col gap-5"
      >
        <Input
          label="Nova lozinka"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Ponovi lozinku"
          type="password"
          autoComplete="new-password"
          error={
            errors.confirm?.message ??
            (update.isError ? 'Promena nije uspela. Pokušaj ponovo.' : undefined)
          }
          {...register('confirm')}
        />
        <Button type="submit" block disabled={update.isPending}>
          {update.isPending ? 'Čuvanje…' : 'Sačuvaj lozinku'}
        </Button>
      </form>
    </AuthLayout>
  )
}
