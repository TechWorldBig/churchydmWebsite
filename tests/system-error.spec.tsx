import { expect, test } from '@playwright/test'
import { systemErrorCopy, systemErrorStatus } from '../src/data/systemError'

test('provides distinct 500 and 503 recovery copy', () => {
  expect(systemErrorCopy[500].title).toBe('Something went wrong')
  expect(systemErrorCopy[503].eyebrow).toBe('Service unavailable · 503')
  expect(systemErrorCopy[503].description).toContain('saved ministry records are not affected')
})

test('maps ordinary render failures to 500 and service failures to 503', () => {
  expect(systemErrorStatus(new Error('render failed'))).toBe(500)
  expect(systemErrorStatus(Object.assign(new Error('unavailable'), { status: 503 }))).toBe(503)
})
