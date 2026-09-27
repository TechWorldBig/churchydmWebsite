import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { createMockState, installApiMocks } from './support/mockData'

const year = String(new Date().getFullYear())

async function expectDownload(
  page: import('@playwright/test').Page,
  buttonName: RegExp | string,
  extension: '.pdf' | '.pptx',
) {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: buttonName }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(new RegExp(`\\${extension}$`, 'i'))
  const path = await download.path()
  expect(path).not.toBeNull()
  const content = await readFile(path!)
  expect(content.byteLength).toBeGreaterThan(1_000)
  expect(content.subarray(0, extension === '.pdf' ? 5 : 2).toString()).toBe(extension === '.pdf' ? '%PDF-' : 'PK')
  return content
}

async function expectPptSlideText(content: Buffer, values: string[]) {
  const archive = await JSZip.loadAsync(content)
  const slide = await archive.file('ppt/slides/slide1.xml')?.async('string')
  expect(slide).toBeTruthy()
  values.forEach(value => expect(slide).toContain(value))
}

test('annual document screens produce printable PDF and PPT downloads', async ({ page }) => {
  test.setTimeout(180_000)
  const state = createMockState()
  state.adminAuthenticated = true
  await installApiMocks(page, state)
  await page.route('**/api/program-points**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 'point-1', memberId: 'member-mary', name: 'Mary Stella', seniority: 'Junior', program: 'Bible Quiz', date: `${year}-05-05`, questionsAnswered: 5 }]),
  }))
  await page.route(/\/api\/weekly-programs(?:\?.*)?$/, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 'weekly-1', serialNo: 1, date: `${year}-05-05`, programName: 'Prayer gathering', memberName: 'Mary Stella', archived: false }]),
  }))

  await page.goto('/admin/yearly-report')
  await expect(page.getByRole('heading', { name: 'Theme builder' })).toBeVisible()
  await expectDownload(page, 'Download one-page PDF', '.pdf')
  const ppt = await expectDownload(page, 'Download one-slide PPT', '.pptx')
  await expectPptSlideText(ppt, ['ANNUAL MINISTRY THEME', 'Empowered by the Holy Spirit', 'Acts 1:8', 'Spirit-led service'])
  await expectDownload(page, 'Download detailed PDF', '.pdf')

  await page.goto('/admin/cake-cover')
  await expect(page.getByRole('heading', { name: 'Cake cover' })).toBeVisible()
  await expectDownload(page, 'Download cake cover PDF', '.pdf')

  await page.goto('/admin/annual-speeches')
  await expect(page.getByRole('heading', { name: 'Welcome speech & vote of thanks' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download Year welcome speech PDF' })).toBeVisible()
  await expectDownload(page, 'Download Year welcome speech PDF', '.pdf')
  await expectDownload(page, 'Download Vote of thanks PDF', '.pdf')
})
