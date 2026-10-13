import { defineConfig } from '@playwright/test'

// `channel: 'chrome'` koristi instalirani Chrome, pa nije potrebno `npx playwright install`.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    viewport: { width: 390, height: 844 },
  },
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
})
