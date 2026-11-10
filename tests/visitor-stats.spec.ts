import { expect, test } from '@playwright/test'
import { createMockState, installApiMocks } from './support/mockData'

test('visitor analytics distinguishes new anonymous browsers from daily traffic', async ({ page }) => {
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
      dailyReturning: 5,
      dailyTraffic: 7,
      devices: [{ device: 'mobile', count: 2 }, { device: 'tablet', count: 0 }, { device: 'desktop', count: 5 }, { device: 'unknown', count: 0 }],
      hours: Array.from({ length: 24 }, (_, hour) => ({ hour, count: hour === 9 ? 3 : 0, devices: {} })),
      locations: [{ country: 'US', region: 'CA', city: 'San Jose', latitude: '37.33939', longitude: '-121.89496', timezone: 'America/Los_Angeles', device: 'desktop', lastSeenAt: '2026-09-27T03:16:00.000Z', activityCount: 4 }],
    }),
  }))

  await page.goto('/admin')
  const section = page.getByRole('heading', { name: 'Website visitors' }).locator('xpath=ancestor::section[1]')
  await expect(page.getByRole('heading', { name: 'Website visitors' })).toBeVisible({ timeout: 15_000 })
  await expect(section.getByText('New unique visitors')).toBeVisible()
  await expect(section.getByText('First-seen browsers on')).toBeVisible()
  await expect(section.getByText('Daily traffic')).toBeVisible()
  await expect(section.getByText('2 new + 5 returning anonymous browsers = 7 estimated visitors')).toBeVisible()
  await expect(section.getByText('Total unique visitors').locator('..').getByText('197', { exact: true })).toBeVisible()
  await expect(section.getByText('New unique visitors').locator('..').getByText('2', { exact: true })).toBeVisible()
  await expect(section.getByText('Daily traffic').locator('..').getByText('7', { exact: true })).toBeVisible()
  await expect(section.getByText('Visitor locations for')).toBeVisible()
  await expect(section.getByText('Activity counts are browser-hour records, not confirmed people.')).toBeVisible()
  await expect(section.getByRole('cell', { name: 'San Jose, CA, US' })).toBeVisible()
  await expect(section.getByRole('cell', { name: '4', exact: true })).toBeVisible()
})
