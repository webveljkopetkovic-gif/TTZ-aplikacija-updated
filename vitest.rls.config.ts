import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// Testovi baze i RLS-a: traže pokrenut lokalni Supabase (`npx supabase start`) i seed (`db reset`).
export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    include: ['supabase/tests/**/*.test.ts'],
    // fajlovi idu jedan za drugim: functions.test.ts pravi privremene klijente koje rls.test.ts ne sme da vidi
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: loadEnv(mode, process.cwd(), ''),
  },
}))
