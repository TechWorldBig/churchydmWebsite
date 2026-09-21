import { expect, test } from '@playwright/test'
import { createMockState, installApiMocks } from './support/mockData'

test.beforeEach(async ({ page }) => {
  await installApiMocks(page, createMockState())
})

test('renders mocked members, attendance statistics, and history', async ({ page }) => {
  await page.goto('/members')
  await expect(page.getByRole('heading', { name: 'YDM Members', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mary Stella' })).toBeVisible()
  await expect(page.getByText('Youth Leader', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sarah', exact: true })).toBeVisible()

  await page.goto('/attendance')
  await expect(page.getByText('Active members').locator('..').getByText('2', { exact: true })).toBeVisible()
  await expect(page.getByText('Overall attendance').locator('..').getByText('67%', { exact: true })).toBeVisible()
  await expect(page.getByText('1/2 present', { exact: true })).toBeVisible()
  await expect(page.getByText('Recorded absent', { exact: true })).not.toBeVisible()
  await expect(page.getByText('Present', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Absent', { exact: true }).first()).toBeVisible()
})

test('searches attendance with the full name and date on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/attendance')
  const currentMonth = new Date().toISOString().slice(0, 7)
  await page.getByPlaceholder('Search by name').fill('Mary Stella')
  await page.getByLabel('From date').fill(`${currentMonth}-15`)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Mary Stella', exact: true })).toBeVisible()
  await expect(page.getByText('Attendance history', { exact: true })).toBeVisible()
  await expect(page.getByText('Absent', { exact: true }).last()).toBeVisible()
})

test('renders gallery data and opens and closes the photo dialog', async ({ page }) => {
  await page.goto('/gallery')
  await expect(page.getByText('Youth worship gathering', { exact: true })).toBeVisible()
  await page.getByText('Youth worship gathering', { exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Expanded gallery photo' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Expanded gallery photo' })).toBeHidden()
})

test('supports mocked admin member and attendance writes without production data', async ({ page }) => {
  await page.route('**/api/auth', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ authenticated: true, expiresAt: Date.now() + 3600000 }) }))
  await page.goto('/admin')
  await expect(page.getByText('Connected to shared database')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Saved members (2)' })).toBeVisible()

  await page.getByLabel('Full name').fill('Daniel')
  await page.getByLabel('Role').fill('Prayer Coordinator')
  await page.getByRole('button', { name: 'Add member' }).click()
  await expect(page.getByText('Member saved successfully.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Saved members (3)' })).toBeVisible()

  await page.locator('select').first().selectOption({ label: 'Daniel' })
  await page.getByPlaceholder('Optional note').fill('First gathering')
  await page.getByRole('button', { name: /^Save/ }).click()
  await expect(page.getByText('Attendance saved successfully.')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Daniel', exact: true })).toBeVisible()
})
