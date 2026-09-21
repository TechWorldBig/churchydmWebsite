import type { Page, Route } from '@playwright/test'

export type MockMember = {
  id: string
  name: string
  role: string
  gender: string
  seniority: 'Kutties' | 'Junior' | 'Senior' | ''
  email: string
  phone: string
  address: string
  dateOfBirth: string
  focus: string
  photo: string
}

export type MockAttendance = {
  id: string
  memberId: string
  name: string
  date: string
  present: boolean
  note: string
}

export type MockGalleryPhoto = {
  id: string
  photo: string
  date: string
  description: string
}

export type AssistantRequest = {
  question: string
  name: string
  language: 'en' | 'ta' | 'ml'
  history: Array<{ role: 'user' | 'assistant'; content: string }>
}

export type MockState = {
  adminAuthenticated?: boolean
  members: MockMember[]
  attendance: MockAttendance[]
  gallery: MockGalleryPhoto[]
  assistantRequests: AssistantRequest[]
}

const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9WQAAAABJRU5ErkJggg=='
const currentMonth = new Date().toISOString().slice(0, 7)

export function createMockState(): MockState {
  return {
    members: [
      {
        id: 'member-mary',
        name: 'Mary Stella',
        role: 'Youth Leader',
        gender: 'Female',
        seniority: 'Junior',
        email: 'mary@example.test',
        phone: '9000000001',
        address: 'Kollemcode',
        dateOfBirth: '2000-01-10',
        focus: 'Worship and prayer',
        photo: '',
      },
      {
        id: 'member-sarah',
        name: 'Sarah',
        role: 'Choir Member',
        gender: 'Male',
        seniority: 'Senior',
        email: 'sarah@example.test',
        phone: '9000000002',
        address: 'Kanniyakumari',
        dateOfBirth: '2001-02-11',
        focus: 'Choir ministry',
        photo: '',
      },
    ],
    attendance: [
      { id: 'attendance-1', memberId: 'member-mary', name: 'Mary Stella', date: `${currentMonth}-15`, present: false, note: 'Recorded absent' },
      { id: 'attendance-2', memberId: 'member-mary', name: 'Mary Stella', date: `${currentMonth}-01`, present: true, note: '' },
      { id: 'attendance-3', memberId: 'member-sarah', name: 'Sarah', date: `${currentMonth}-15`, present: true, note: '' },
    ],
    gallery: [
      { id: 'gallery-1', photo: pixel, date: `${currentMonth}-05`, description: 'Youth worship gathering' },
    ],
    assistantRequests: [],
  }
}

async function fulfillJson(route: Route, json: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) })
}

export async function installApiMocks(
  page: Page,
  state: MockState,
  assistantReply: (request: AssistantRequest) => string = (request) => `Mock ${request.language} answer`,
) {
  await page.route(/\/api\/auth(?:\/login)?$/, async route => {
    const method = route.request().method()
    if (method === 'POST') state.adminAuthenticated = true
    if (method === 'DELETE') state.adminAuthenticated = false
    return fulfillJson(route, { authenticated: Boolean(state.adminAuthenticated), expiresAt: state.adminAuthenticated ? Date.now() + 3600000 : null })
  })
  await page.route('**/api/members', async (route) => {
    const method = route.request().method()
    const body = route.request().postDataJSON() as Partial<MockMember> | { id?: string } | null
    if (method === 'GET') return fulfillJson(route, state.members)
    if (method === 'POST') state.members.unshift(body as MockMember)
    if (method === 'PUT') state.members = state.members.map((item) => item.id === body?.id ? body as MockMember : item)
    if (method === 'DELETE') state.members = state.members.filter((item) => item.id !== body?.id)
    return fulfillJson(route, { ok: true })
  })

  await page.route('**/api/attendance', async (route) => {
    const method = route.request().method()
    const body = route.request().postDataJSON() as Partial<MockAttendance> | { id?: string } | null
    if (method === 'GET') return fulfillJson(route, state.attendance)
    if (method === 'POST') state.attendance.unshift(body as MockAttendance)
    if (method === 'PUT') state.attendance = state.attendance.map((item) => item.id === body?.id ? body as MockAttendance : item)
    if (method === 'DELETE') state.attendance = state.attendance.filter((item) => item.id !== body?.id)
    return fulfillJson(route, { ok: true })
  })

  await page.route('**/api/gallery', async (route) => {
    const method = route.request().method()
    const body = route.request().postDataJSON() as Partial<MockGalleryPhoto> | { id?: string } | null
    if (method === 'GET') return fulfillJson(route, state.gallery)
    if (method === 'POST') state.gallery.unshift(body as MockGalleryPhoto)
    if (method === 'PUT') state.gallery = state.gallery.map((item) => item.id === body?.id ? body as MockGalleryPhoto : item)
    if (method === 'DELETE') state.gallery = state.gallery.filter((item) => item.id !== body?.id)
    return fulfillJson(route, { ok: true })
  })

  await page.route('**/api/updated', (route) => fulfillJson(route, { value: `${currentMonth}-15T10:30:00.000Z`, version: 'mock-deployment' }))
  await page.route('**/api/assistant', async (route) => {
    const request = route.request().postDataJSON() as AssistantRequest
    state.assistantRequests.push(request)
    await fulfillJson(route, { answer: assistantReply(request) })
  })

  await page.route('https://bible.helloao.org/api/tam_irv/GEN/1.simple.json', (route) => fulfillJson(route, {
    translation: { name: 'Indian Revised Version (Tamil)', shortName: 'IRV-Tamil' },
    book: { id: 'GEN', name: 'ஆதியாகமம்', commonName: 'ஆதியாகமம்' },
    chapter: { content: [{ type: 'verse', number: 1, text: 'ஆதியிலே தேவன் வானத்தையும் பூமியையும் சிருஷ்டித்தார்.' }] },
  }))
}
