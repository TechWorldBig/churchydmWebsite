import { expect, test } from '@playwright/test'
import { createMockState, installApiMocks } from './support/mockData'

const routes = [
  '/',
  '/members',
  '/gallery',
  '/programs',
  '/attendance',
  '/offering',
  '/about',
  '/admin',
  '/admin/certificates',
  '/admin/year-archive',
  '/admin/cake-cover',
  '/admin/annual-speeches',
  '/admin/yearly-report',
] as const

const viewports = [320, 375, 390, 768, 1024, 1440, 1920] as const

test.describe.configure({ mode: 'parallel' })

for (const width of viewports) {
  for (const route of routes) {
    test(`visual audit ${route} at ${width}px`, async ({ page }, testInfo) => {
      const state = createMockState()
      state.adminAuthenticated = route.startsWith('/admin')
      await installApiMocks(page, state)
      await page.setViewportSize({ width, height: width < 640 ? 844 : 900 })
      await page.goto(route)
      await expect(page.locator('main')).toBeVisible()
      await page.waitForTimeout(350)

      const layout = await page.evaluate(() => {
        const overflow = document.documentElement.scrollWidth > window.innerWidth + 1
        const selectors = 'main button, main input, main select, main textarea, header a, header button'
        const elements = [...document.querySelectorAll<HTMLElement>(selectors)]
        const visible = elements.filter(element => {
          const rect = element.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden'
        })
        const clipped = visible.filter(element => {
          const rect = element.getBoundingClientRect()
          return rect.left < -1 || rect.right > window.innerWidth + 1
        })
        const overlaps: string[] = []
        for (let index = 0; index < visible.length; index += 1) {
          const first = visible[index]
          const firstRect = first.getBoundingClientRect()
          for (let next = index + 1; next < visible.length; next += 1) {
            const second = visible[next]
            if (first.contains(second) || second.contains(first)) continue
            const secondRect = second.getBoundingClientRect()
            const intersects = firstRect.left < secondRect.right && firstRect.right > secondRect.left && firstRect.top < secondRect.bottom && firstRect.bottom > secondRect.top
            if (intersects && first.closest('header') === second.closest('header')) {
              overlaps.push(`${first.tagName}.${first.className} <> ${second.tagName}.${second.className}`)
            }
          }
        }
        return { overflow, clipped: clipped.map(element => element.outerHTML.slice(0, 160)), overlaps }
      })

      expect(layout.overflow, `horizontal overflow on ${route} at ${width}px`).toBe(false)
      expect(layout.clipped, `clipped controls on ${route} at ${width}px`).toEqual([])
      expect(layout.overlaps, `navigation overlap on ${route} at ${width}px`).toEqual([])
      await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll('/', '_').replace(/^_/, '') || 'home'}-${width}.png`), fullPage: true, animations: 'disabled', scale: 'css' })
    })
  }
}
