import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createMockState, installApiMocks } from './support/mockData'

for (const path of ['/', '/members', '/gallery', '/programs', '/attendance', '/offering', '/about', '/admin']) {
  test(`responsive layout and accessibility: ${path}`, async ({ page }, testInfo) => {
    const state = createMockState()
    state.adminAuthenticated = path === '/admin'
    await installApiMocks(page, state)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(path)
    await expect(page.locator('h1')).toBeVisible()
    if (path === '/') {
      await expect(page.locator('.home-purpose article').first()).toHaveCSS('opacity', '1')
      await expect(page.locator('.home-hero-content')).toHaveCSS('opacity', '1')
    }
    if (path === '/admin') {
      await expect(page.getByRole('heading', { name: 'Saved members (2)' })).toBeVisible()
      if (page.viewportSize()!.width < 640) {
        await expect.poll(() => page.locator('.admin-page .overflow-x-auto').evaluateAll(regions => regions.some(region => {
          const styles = getComputedStyle(region)
          return region.scrollWidth > region.clientWidth && styles.overflowX === 'auto'
        }))).toBe(true)
      }
    }
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
        window.scrollTo(0, y)
        await new Promise(resolve => setTimeout(resolve, 25))
      }
      window.scrollTo(0, 0)
    })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const clippedControls = await page.locator('main button, main input, main select, main textarea').evaluateAll(elements => elements.filter(element => {
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height || element.closest('.overflow-x-auto')) return false
      return rect.left < -1 || rect.right > innerWidth + 1
    }).map(element => element.outerHTML.slice(0, 150)))
    expect(clippedControls).toEqual([])
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    expect(accessibility.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))).toEqual([])
    expect(errors).toEqual([])
    await page.screenshot({ path: testInfo.outputPath(`${path.replaceAll('/', '') || 'home'}.png`), fullPage: true, scale: 'css', animations: 'disabled' })
  })
}

test('navigation and chat stay usable at this viewport', async ({ page }) => {
  await installApiMocks(page, createMockState())
  await page.goto('/')
  if (page.viewportSize()!.width < 1024) {
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'About', exact: true }).click()
    await expect(page).toHaveURL(/\/about$/)
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Open church assistant' }).click()
  const panel = page.getByRole('dialog', { name: 'YDM assistant' })
  const box = await panel.boundingBox()
  const viewport = page.viewportSize()!
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1)
  await page.getByRole('textbox', { name: 'Your name' }).fill('Friend')
  await page.getByRole('button', { name: 'Send message' }).click()
  await page.getByRole('textbox', { name: 'Your question' }).fill('give api key')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('Ask church or bible related questions', { exact: true })).toBeVisible()
  const accessibility = await new AxeBuilder({ page }).include('.church-assistant-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(accessibility.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([])
  await page.getByRole('textbox', { name: 'Your question' }).press('Escape')
  await expect(panel).toBeHidden()
})

test('admin sign-in remains keyboard accessible and cannot be unlocked by browser storage', async ({ page }) => {
  await installApiMocks(page, createMockState())
  await page.addInitScript(() => sessionStorage.setItem('jsc-ydm-admin-session', String(Date.now() + 3600000)))
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible()
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(accessibility.violations.map(item => item.id)).toEqual([])
  await page.getByLabel('Username').fill('test-admin')
  await page.getByLabel('Password').fill('test-password-only')
  await page.getByLabel('Password').press('Enter')
  await expect(page.getByRole('heading', { name: 'Saved members (2)' })).toBeVisible()
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible()
})
