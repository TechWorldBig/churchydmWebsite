import { expect, test } from '@playwright/test'

for (const device of [
  { name: 'mobile', viewport: { width: 390, height: 844 } },
  { name: 'laptop', viewport: { width: 1366, height: 768 } },
]) {
  test.describe(device.name, () => {
    test.use({ viewport: device.viewport })

    test('unknown routes show a useful 404 page', async ({ page }) => {
      await page.goto('/this-page-does-not-exist')
      await expect(page.getByRole('heading', { name: 'This page isn’t here' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/')
      await page.getByRole('link', { name: 'Go to home' }).click()
      await expect(page).toHaveURL('/')
    })

    test('offline state appears and reconnecting reloads the current page', async ({ context, page }) => {
      await page.goto('/about')
      await context.setOffline(true)
      await page.evaluate(() => window.dispatchEvent(new Event('offline')))
      await expect(page.getByRole('heading', { name: 'You’re offline' })).toBeVisible()
      await expect(page.getByText('This page will refresh automatically')).toBeVisible()

      await context.setOffline(false)
      await page.evaluate(() => window.dispatchEvent(new Event('online'))).catch(() => undefined)
      await expect(page).toHaveURL('/about')
      await expect(page.getByRole('heading', { name: 'You’re offline' })).toBeHidden()
    })
  })
}
