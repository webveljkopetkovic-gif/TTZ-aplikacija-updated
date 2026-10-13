import { describe, expect, it } from 'vitest'
import { loginSchema, newPasswordSchema } from './authSchema'

describe('loginSchema', () => {
  it('prihvata ispravan email i lozinku', () => {
    expect(loginSchema.safeParse({ email: ' ana@primer.rs ', password: 'x' }).success).toBe(true)
  })

  it('odbija prazan i neispravan email', () => {
    expect(loginSchema.safeParse({ email: '', password: 'x' }).success).toBe(false)
    expect(loginSchema.safeParse({ email: 'ana', password: 'x' }).success).toBe(false)
  })

  it('odbija praznu lozinku', () => {
    expect(loginSchema.safeParse({ email: 'ana@primer.rs', password: '' }).success).toBe(false)
  })
})

describe('newPasswordSchema', () => {
  it('traži najmanje 8 znakova', () => {
    expect(newPasswordSchema.safeParse({ password: 'kratko', confirm: 'kratko' }).success).toBe(
      false,
    )
  })

  it('traži da se lozinke poklapaju', () => {
    const result = newPasswordSchema.safeParse({
      password: 'dovoljno-dugo',
      confirm: 'drugacije-123',
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0].path).toEqual(['confirm'])
  })

  it('prihvata ispravnu lozinku', () => {
    expect(
      newPasswordSchema.safeParse({ password: 'dovoljno-dugo', confirm: 'dovoljno-dugo' }).success,
    ).toBe(true)
  })
})
