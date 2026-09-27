import { expect, test } from '@playwright/test'
import { createMockState, installApiMocks } from './support/mockData'

test('visitor analytics distinguishes new lifetime IPs from daily traffic', async ({ page }) => {
  const state = createMockState()
  state.adminAuthenticated = true
  await installApiMocks(page, state)
  await page.route(/\/api\/visitors\?date=.*/, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      date: '2026-09-27',
      total: 197,
      dailyNew: 2,
      dailyTraffic: 7,
      devices: [{ device: 'mobile', count: 2 }, { device: 'tablet', count: 0 }, { device: 'desktop', count: 5 }, { device: 'unknown', count: 0 }],
      hours: Array.from({ length: 24 }, (_, hour) => ({ hour, count: hour === 9 ? 3 : 0, devices: {} })),
      locations: [],
    }),
  }))

  await page.goto('/admin')
  const section = page.getByRole('heading', { name: 'Website visitors' }).locator('..').locator('..').locator('..')
  await expect(page.getByRole('heading', { name: 'Website visitors' })).toBeVisible()
  await expect(section.getByText('New unique visitors')).toBeVisible()
  await expect(section.getByText('First-seen IPs on')).toBeVisible()
  await expect(section.getByText('Daily traffic')).toBeVisible()
  await expect(section.getByText('All distinct IPs on')).toBeVisible()
  await expect(section.getByText('197', { exact: true })).toBeVisible()
  await expect(section.getByText('2', { exact: true })).toBeVisible()
  await expect(section.getByText('7', { exact: true })).toBeVisible()
})
