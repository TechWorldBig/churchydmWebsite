import { expect, test } from '@playwright/test'
import { createMockState, installApiMocks } from './support/mockData'

test('completed-year weekly programs appear in the protected year archive', async ({ page }) => {
  const state = createMockState()
  state.adminAuthenticated = true
  const archivedYear = String(new Date().getFullYear() - 1)

  await installApiMocks(page, state)
  await page.route('**/api/year-archive', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{
      year: archivedYear,
      payload: {
        year: archivedYear,
        members: [],
        attendance: [],
        points: [],
        weekly: [{
          id: 'weekly-archive-1',
          date: `${archivedYear}-12-20`,
          serialNo: 1,
          programName: 'Christmas Bible reading',
          memberId: 'member-mary',
          memberName: 'Mary Stella',
          archivedAt: `${archivedYear}-12-21T00:00:00.000Z`,
        }],
      },
    }]),
  }))

  await page.goto('/admin/year-archive')

  await expect(page.getByLabel('Archived year')).toHaveValue(archivedYear, { timeout: 30_000 })
  await expect(page.getByText('Weekly programs').first()).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Christmas Bible reading' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Mary Stella' })).toBeVisible()
})

test('archived annual program can be permanently deleted after confirmation', async ({ page }) => {
  const state = createMockState()
  state.adminAuthenticated = true
  const archivedYear = String(new Date().getFullYear() - 1)
  let deletedId = ''

  await installApiMocks(page, state)
  await page.route('**/api/year-archive**', async route => {
    const request = route.request()
    if (request.method() === 'DELETE') {
      deletedId = (request.postDataJSON() as { id: string }).id
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    }
    const body = request.url().includes('annualPrograms=1') ? [{ id: 'annual-1', year: archivedYear, date: `${archivedYear}-11-29`, theme: 'Jesus is Good', rows: [{ serialNo: 1, programName: 'Prayer', memberName: 'Mary' }] }] : []
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })

  await page.goto('/admin/year-archive')
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('permanently delete it from the database')
    await dialog.accept()
  })
  await page.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByText('Jesus is Good')).toHaveCount(0)
  expect(deletedId).toBe('annual-1')
})
