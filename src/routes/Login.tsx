import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate } from 'react-router-dom'
import { useProfile, useSession, useSignIn } from '@/api/auth'
import { AuthLayout } from '@/components/AuthLayout'
import { Button, Input } from '@/components/ui'
import { loginSchema, type LoginValues } from '@/lib/authSchema'
import { homeForRole } from '@/lib/roles'

export default function Login() {
  const session = useSession()
  const profile = useProfile(session.data?.user.id)
  const signIn = useSignIn()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  if (profile.data) return <Navigate to={homeForRole(profile.data.role)} replace />

  const authError = signIn.isError ? 'Pogrešan email ili lozinka. Pokušaj ponovo.' : undefined

  return (
    <AuthLayout title="Dobro došli" accent="nazad" subtitle="Tvoj tim te čeka.">
      <form
        noValidate
        onSubmit={handleSubmit((values) => signIn.mutate(values))}
        className="flex flex-col gap-5"
      >
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Lozinka"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message ?? authError}
          {...register('password')}
        />
        <Link to="/zaboravljena-lozinka" className="self-end font-bold text-brand-text underline">
          Zaboravljena lozinka?
        </Link>
        <Button type="submit" block disabled={signIn.isPending}>
          {signIn.isPending ? 'Prijavljivanje…' : 'Prijavi se'}
        </Button>
      </form>
      <p className="mt-auto pt-10 text-center text-muted">
        Nemaš nalog?{' '}
        <Link to="/anketa/1" className="font-bold text-brand-text underline">
          Registruj se
        </Link>
      </p>
    </AuthLayout>
  )
}
