import { expect, test } from '@playwright/test'

test('/dev/ui prikazuje komponente', async ({ page }) => {
  await page.goto('/dev/ui')
  await expect(page.getByRole('heading', { name: /UI komponente/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Prijavi se' })).toBeVisible()
})
