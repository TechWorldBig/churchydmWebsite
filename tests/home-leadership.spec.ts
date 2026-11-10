import { expect, test } from '@playwright/test'
import { createMockState, installApiMocks } from './support/mockData'

test('homepage displays only current database presidents', async ({ page }) => {
  const state = createMockState()
  state.members = [
    { ...state.members[0], id: 'president-1', name: 'Current One', role: 'President' },
    { ...state.members[1], id: 'vice-president', name: 'Vice Person', role: 'Vice President' },
    { ...state.members[0], id: 'president-2', name: 'Current Two', role: 'YDM President' },
    { ...state.members[1], id: 'former-president', name: 'Former Person', role: 'Former President' },
  ]
  await installApiMocks(page, state)

  await page.goto('/')

  const leadership = page.locator('.home-cta').getByText(/^YDM Presidents:/)
  await expect(leadership).toHaveText('YDM Presidents: Current One & Current Two', { timeout: 15_000 })
  await expect(page.locator('.home-cta')).not.toContainText('Vice Person')
  await expect(page.locator('.home-cta')).not.toContainText('Former Person')
})
