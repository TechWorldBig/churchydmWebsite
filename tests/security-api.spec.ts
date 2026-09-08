import { neonConfig } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import { expect, test } from '@playwright/test'
import adminDashboard from '../api/admin/dashboard'
import auth from '../api/auth'
import login from '../api/auth/login'
import members from '../api/members'
import attendance from '../api/attendance'
import gallery from '../api/gallery'
import { sameSecret, sessionCookie, sessionToken } from '../api/_lib/security'
import { readMutation } from '../api/_lib/validation'

function request(method = 'POST', body: unknown = {}) {
  const result = { status: 200, body: null as any, headers: {} as Record<string, string> }
  return {
    req: { method, body, headers: { host: 'example.test', origin: 'https://example.test', 'content-type': 'application/json', cookie: '' } },
    res: {
      status(status: number) { result.status = status; return this },
      json(body: unknown) { result.body = body; return body },
      setHeader(name: string, value: string) { result.headers[name] = value },
      end() { return undefined },
    },
    result,
  }
}

for (const [name, handler] of [['members', members], ['attendance', attendance], ['gallery', gallery]] as const) {
  for (const method of ['POST', 'PUT', 'DELETE']) {
    test(`${name} ${method} rejects unauthenticated writes before accessing the database`, async () => {
      const call = request(method, { id: 'test-id' })
      await handler(call.req, call.res)
      expect(call.result.status).toBe(401)
      expect(call.result.headers['Cache-Control']).toBe('no-store')
    })
  }
  test(`${name} rejects cross-origin writes`, async () => {
    const call = request()
    call.req.headers.origin = 'https://attacker.test'
    await handler(call.req, call.res)
    expect(call.result.status).toBe(403)
  })
}

test('admin cookie is HttpOnly, Secure, host-scoped and SameSite in production', () => {
  const previous = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  try {
    const cookie = sessionCookie('a'.repeat(64))
    expect(cookie).toContain('__Host-ydm-session=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Strict')
    expect(cookie).not.toContain('Domain=')
    expect(sessionCookie('', 0)).toContain('Max-Age=0')
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previous
  }
})

test('rejects malformed cookies and compares secrets without length-dependent errors', () => {
  const call = request()
  call.req.headers.cookie = 'ydm-session=forged'
  expect(sessionToken(call.req)).toBeNull()
  expect(sameSecret('correct-secret', 'correct-secret')).toBe(true)
  expect(sameSecret('short', 'different-long-secret')).toBe(false)
})

test('unauthenticated session check and protected dashboard reveal no credentials', async () => {
  const session = request('GET')
  await auth(session.req, session.res)
  expect(session.result.body).toEqual({ authenticated: false, expiresAt: null })
  const dashboard = request('GET')
  await adminDashboard(dashboard.req, dashboard.res)
  expect(dashboard.result.status).toBe(401)
  expect(dashboard.result.body).toEqual({ error: 'Unauthorized' })
})

test('rejects cross-origin login and malformed JSON', async () => {
  const crossOrigin = request()
  crossOrigin.req.headers.origin = 'https://attacker.test'
  await login(crossOrigin.req, crossOrigin.res)
  expect(crossOrigin.result.status).toBe(403)
  const malformed = request('POST', '{broken')
  await login(malformed.req, malformed.res)
  expect(malformed.result.status).toBe(400)
})

test('admin sign-in stays disabled without configured bootstrap credentials', async () => {
  const previous = process.env.ADMIN_PASSWORD
  delete process.env.ADMIN_PASSWORD
  try {
    const call = request('POST', { username: 'admin', password: 'anything' })
    await login(call.req, call.res)
    expect(call.result.status).toBe(503)
    expect(call.result.headers['Set-Cookie']).toBeUndefined()
  } finally { if (previous !== undefined) process.env.ADMIN_PASSWORD = previous }
})

test('rejects executable images and invalid attendance dates', () => {
  const image = request('POST', { id: 'photo', date: '2026-01-01', photo: 'data:image/svg+xml;base64,PHN2Zz4=' })
  expect(readMutation(image.req, image.res, 'gallery')).toBeNull()
  expect(image.result.status).toBe(400)
  const record = request('POST', { id: 'record', memberId: 'member', name: 'Friend', date: '2026-02-30', present: true })
  expect(readMutation(record.req, record.res, 'attendance')).toBeNull()
  expect(record.result.status).toBe(400)
})

test('login uses a bcrypt password_hash in Neon, rate limits attempts, and creates revocable sessions', async () => {
  const originalFetch = neonConfig.fetchFunction
  const originalEnv = { DATABASE_URL: process.env.DATABASE_URL, ADMIN_USERNAME: process.env.ADMIN_USERNAME, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD }
  process.env.DATABASE_URL = 'postgresql://test:test@database.example.test/test'
  process.env.ADMIN_USERNAME = 'test-admin'
  process.env.ADMIN_PASSWORD = 'long-test-password-123456'
  const sessions = new Map<string, { username: string; version: string; expires: string }>()
  const rateLimits = new Map<string, number>()
  let passwordHash = ''
  const mutations: string[] = []
  neonConfig.fetchFunction = async (_url, init) => {
    const { query, params } = JSON.parse(String(init?.body))
    let fields: Array<{ name: string; dataTypeID: number }> = []
    let rows: string[][] = []
    if (query.startsWith('INSERT INTO api_rate_limits')) {
      const count = (rateLimits.get(params[0]) || 0) + 1
      rateLimits.set(params[0], count)
      fields = [{ name: 'count', dataTypeID: 23 }]
      rows = [[String(count)]]
    }
    if (query.startsWith('SELECT password_hash FROM admin_credentials')) {
      fields = [{ name: 'password_hash', dataTypeID: 25 }]
      if (passwordHash) rows = [[passwordHash]]
    }
    if (query.startsWith('INSERT INTO admin_credentials')) passwordHash = params[1]
    if (query.startsWith('SELECT username, password_hash FROM admin_credentials')) {
      fields = [{ name: 'username', dataTypeID: 25 }, { name: 'password_hash', dataTypeID: 25 }]
      if (passwordHash) rows = [['test-admin', passwordHash]]
    }
    if (query.startsWith('INSERT INTO admin_sessions')) sessions.set(params[0], { username: params[1], version: params[2], expires: params[3] })
    if (query.startsWith('SELECT expires_at, username, credential_version')) {
      const stored = sessions.get(params[0])
      fields = [{ name: 'expires_at', dataTypeID: 25 }, { name: 'username', dataTypeID: 25 }, { name: 'credential_version', dataTypeID: 25 }]
      if (stored && Date.parse(stored.expires) > Date.now()) rows = [[stored.expires, stored.username, stored.version]]
    }
    if (query.startsWith('DELETE FROM admin_sessions WHERE token_hash')) sessions.delete(params[0])
    if (query.startsWith('DELETE FROM members')) mutations.push(params[0])
    return new Response(JSON.stringify({ fields, rows }))
  }
  try {
    const invalid = request('POST', { username: 'test-admin', password: 'incorrect-password' })
    await login(invalid.req, invalid.res)
    expect(invalid.result.status).toBe(401)
    const signIn = request('POST', { username: 'test-admin', password: process.env.ADMIN_PASSWORD })
    await login(signIn.req, signIn.res)
    expect(signIn.result.status).toBe(200)
    expect(signIn.result.body.authenticated).toBe(true)
    expect(await bcrypt.compare(process.env.ADMIN_PASSWORD!, passwordHash)).toBe(true)
    const cookie = signIn.result.headers['Set-Cookie'].split(';')[0]
    expect([...sessions.keys()]).not.toContain(cookie.split('=')[1])
    const mutation = request('DELETE', { id: 'test-member' })
    mutation.req.headers.cookie = cookie
    await members(mutation.req, mutation.res)
    expect(mutation.result.status).toBe(200)
    expect(mutations).toEqual(['test-member'])
    passwordHash = await bcrypt.hash('rotated-test-password-123456', 12)
    const rotated = request('GET'); rotated.req.headers.cookie = cookie
    await auth(rotated.req, rotated.res)
    expect(rotated.result.body.authenticated).toBe(false)
    const logout = request('DELETE'); logout.req.headers.cookie = cookie
    await auth(logout.req, logout.res)
    expect(logout.result.status).toBe(200)
    expect(sessions.size).toBe(0)
    const replay = request('DELETE', { id: 'test-member' }); replay.req.headers.cookie = cookie
    await members(replay.req, replay.res)
    expect(replay.result.status).toBe(401)
    expect(mutations).toHaveLength(1)
    for (let index = 0; index < 4; index += 1) await login(request('POST', { username: 'test-admin', password: 'bad-password' }).req, request().res)
    const limited = request('POST', { username: 'test-admin', password: 'bad-password' })
    await login(limited.req, limited.res)
    expect(limited.result.status).toBe(429)
    expect(limited.result.headers['Retry-After']).toBe('900')
  } finally {
    neonConfig.fetchFunction = originalFetch
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
