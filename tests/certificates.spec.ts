import { expect, test } from '@playwright/test'
import { getCertificateAwards } from '../src/data/certificates'
import type { AttendanceRecord, Member, ProgramPoint } from '../src/data/memberStore'
import { createMockState, installApiMocks } from './support/mockData'

const year = String(new Date().getFullYear())
const member = (id: string, name: string, seniority: Member['seniority'], role = 'YDM Member'): Member => ({
  id, name, seniority, role, email: '', phone: '', address: '', gender: '', dateOfBirth: '', focus: '', photo: '',
})
const point = (id: string, memberId: string, name: string, seniority: ProgramPoint['seniority'], score: number): ProgramPoint => ({
  id, memberId, name, seniority, program: 'Bible Quiz', date: `${year}-09-15`, questionsAnswered: score,
})

test('certificate eligibility requires every meeting and shares tied program places', () => {
  const members = [member('mary', 'Mary', 'Junior'), member('sarah', 'Sarah', 'Junior'), member('joel', 'Joel', 'Junior')]
  const records: AttendanceRecord[] = [
    { id: '1', memberId: 'mary', name: 'Mary', date: `${year}-09-01`, present: true, note: '' },
    { id: '2', memberId: 'mary', name: 'Mary', date: `${year}-09-15`, present: true, note: '' },
    { id: '3', memberId: 'sarah', name: 'Sarah', date: `${year}-09-01`, present: true, note: '' },
    { id: '4', memberId: 'joel', name: 'Joel', date: `${year}-09-15`, present: false, note: '' },
  ]
  const awards = getCertificateAwards(members, records, [point('p1', 'mary', 'Mary', 'Junior', 5), point('p2', 'sarah', 'Sarah', 'Junior', 5), point('p3', 'joel', 'Joel', 'Junior', 3)], year)
  expect(awards.filter(award => award.kind === 'attendance').map(award => award.member.name)).toEqual(['Mary'])
  expect(awards.filter(award => award.kind === 'program').map(award => `${award.member.name}: ${award.title}`)).toEqual([
    'Mary: First place · Bible Quiz', 'Sarah: First place · Bible Quiz', 'Joel: Second place · Bible Quiz',
  ])
  expect(getCertificateAwards(members, [], [], year)).toEqual([])
})

test('leadership appreciation excludes YDM members and children', () => {
  const awards = getCertificateAwards([
    member('president', 'Jayan', 'Senior', 'President'),
    member('advisor', 'Finny', 'Senior', 'Advisor'),
    member('member', 'Regular Member', 'Junior'),
    member('child', 'YDM Child', 'Kutties', 'YDM Children'),
  ], [], [], year)
  const appreciation = awards.filter(award => award.kind === 'appreciation')
  expect(appreciation.map(award => award.member.name)).toEqual(['Finny', 'Jayan'])
  expect(appreciation[0].reason).toContain(`making ${year} wonderful`)
})

test('overall champion requires perfect attendance and all three program wins', () => {
  const champion = member('champion', 'Champion', 'Junior', 'President')
  const otherLevel = member('other-level', 'Other Level', 'Kutties', 'Secretary')
  const records: AttendanceRecord[] = [
    { id: 'a1', memberId: champion.id, name: champion.name, date: `${year}-09-01`, present: true, note: '' },
    { id: 'a2', memberId: otherLevel.id, name: otherLevel.name, date: `${year}-09-01`, present: true, note: '' },
  ]
  const points = [champion, otherLevel].flatMap((person, personIndex) => (['Bible Quiz', 'Bible Reference', 'Song Survey'] as const).map((program, index) => ({
    id: `p${personIndex}-${index}`, memberId: person.id, name: person.name, seniority: person.seniority, program, date: `${year}-09-01`, questionsAnswered: 5,
  })))
  const awards = getCertificateAwards([champion, otherLevel], records, points, year)
  expect(awards.filter(award => award.kind === 'overall').map(award => award.member.name)).toEqual(['Champion', 'Other Level'])
  expect(awards.find(award => award.kind === 'overall')?.reason).toContain('first place in Bible Quiz, Bible Reference and Song Survey')
})

test('admin can preview and print an eligible certificate', async ({ page }, testInfo) => {
  const state = createMockState()
  state.adminAuthenticated = true
  state.attendance.push({ id: 'attendance-4', memberId: 'member-sarah', name: 'Sarah', date: `${year}-09-01`, present: true, note: '' })
  await installApiMocks(page, state)
  await page.route('**/api/program-points', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
    point('p1', 'member-mary', 'Mary Stella', 'Junior', 5), point('p2', 'member-sarah', 'Sarah', 'Senior', 4),
  ]) }))
  await page.goto('/admin/certificates')
  const section = page.getByRole('region', { name: 'Certificates' })
  await expect(section.getByText('3 certificates ready')).toBeVisible({ timeout: 15000 })
  await section.getByRole('button', { name: /Sarah Perfect attendance/ }).click()
  await expect(section.locator('.ydm-certificate').first().locator('.ydm-cert-name')).toHaveText('Sarah')
  await expect(section.locator('.ydm-certificate').first().locator('.ydm-cert-reason')).toContainText('100% attendance')
  await section.locator('.ydm-certificate').first().screenshot({ path: testInfo.outputPath('certificate-preview.png') })
  const popupPromise = page.waitForEvent('popup')
  await section.getByRole('button', { name: 'Download PDF' }).click()
  const popup = await popupPromise
  await expect(popup.locator('.ydm-cert-praise')).toHaveText('Praise the Lord')
  await expect(popup.locator('.ydm-cert-logo')).toBeVisible()
  await expect(popup.locator('.ydm-cert-signature')).toHaveCount(2)
  const pdf = await popup.pdf({ preferCSSPageSize: true, printBackground: true })
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  await popup.close()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(section.getByRole('button', { name: 'Download PDF' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect.poll(() => section.locator('.ydm-certificate').first().evaluate(node => node.parentElement!.scrollWidth > node.parentElement!.clientWidth)).toBe(true)
  await page.route('**/api/program-points', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }))
  await section.getByRole('button', { name: 'Refresh results' }).click()
  await expect(section.getByRole('alert')).toContainText('Could not load certificate data')
  await expect(section.getByRole('button', { name: 'Download PDF' })).toHaveCount(0)
})

test('admin can preview and print a YDM membership card', async ({ page }) => {
  const state = createMockState()
  state.adminAuthenticated = true
  await installApiMocks(page, state)
  await page.goto('/admin/certificates')
  const section = page.getByRole('region', { name: 'YDM membership cards' })
  await expect(section.getByRole('heading', { name: 'YDM membership cards' })).toBeVisible()
  await section.getByLabel('Choose member').selectOption('member-sarah')
  await expect(section.locator('.ydm-card-name')).toHaveText('Sarah')
  await expect(section.locator('.ydm-card-overline')).toHaveText('JSC YDM')
  const popupPromise = page.waitForEvent('popup')
  await section.getByRole('button', { name: 'Download card' }).click()
  const popup = await popupPromise
  await expect(popup.locator('.ydm-card-name')).toHaveText('Sarah')
  await expect(popup.locator('.ydm-card-logo')).toBeVisible()
  await expect(popup.locator('.ydm-card-id')).toHaveText(/^YDM-/)
  await popup.close()
})

test('certificates screen requires an admin session', async ({ page }) => {
  await installApiMocks(page, createMockState())
  await page.goto('/admin/certificates')
  await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Certificates' })).toHaveCount(0)
})
