import { z } from 'zod'

const email = z.string().trim().min(1, 'Unesi email').pipe(z.email('Unesi ispravan email'))

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Unesi lozinku'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({ email })
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, 'Lozinka ima najmanje 8 znakova'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Lozinke se ne poklapaju',
  })
export type NewPasswordValues = z.infer<typeof newPasswordSchema>
