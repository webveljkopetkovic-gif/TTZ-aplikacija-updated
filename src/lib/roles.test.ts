import { describe, expect, it } from 'vitest'
import { homeForRole } from './roles'

describe('homeForRole', () => {
  it('klijent ide na /app', () => expect(homeForRole('client')).toBe('/app'))
  it('partner ide na /partner', () => expect(homeForRole('partner')).toBe('/partner'))
  it.each(['nutritionist', 'trainer', 'admin'] as const)('%s ide na /tim', (role) => {
    expect(homeForRole(role)).toBe('/tim')
  })
})
