import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { getSql } from './db.js'

export const SESSION_SECONDS = 8 * 60 * 60
const cookieName = () => process.env.NODE_ENV === 'production' ? '__Host-ydm-session' : 'ydm-session'
export const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const canonicalUsername = (value: string) => value.trim().toLocaleLowerCase('en-US')

// Environment credentials only bootstrap the first Neon record. Neon stores a bcrypt hash, never the password.
export const credentialsConfigured = () => Boolean(
  process.env.ADMIN_USERNAME && (process.env.ADMIN_PASSWORD?.length || 0) >= 16,
)

export function sameSecret(left: string, right: string): boolean {
  return timingSafeEqual(Buffer.from(digest(left), 'hex'), Buffer.from(digest(right), 'hex'))
}

export function sessionToken(req: any): string | null {
  const value = String(req.headers.cookie || '')
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${cookieName()}=`))
    ?.slice(cookieName().length + 1)
  return value && /^[a-f0-9]{64}$/u.test(value) ? value : null
}

export function sessionCookie(value: string, maxAge = SESSION_SECONDS): string {
  return `${cookieName()}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}

export async function ensureSecuritySchema() {
  const sql = getSql()
  await sql`CREATE TABLE IF NOT EXISTS admin_credentials (username TEXT PRIMARY KEY, password_hash TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`
  await sql`CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, username TEXT NOT NULL DEFAULT '', credential_version TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL)`
  await sql`ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT ''`
  await sql`CREATE TABLE IF NOT EXISTS api_rate_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL)`
}

async function ensureBootstrapCredential() {
  if (!credentialsConfigured()) return
  const username = canonicalUsername(process.env.ADMIN_USERNAME!)
  const sql = getSql()
  const existing = await sql`SELECT password_hash FROM admin_credentials WHERE username=${username}`
  if (existing[0]) return
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 12)
  await sql`INSERT INTO admin_credentials (username, password_hash) VALUES (${username}, ${passwordHash}) ON CONFLICT (username) DO NOTHING`
}

export async function verifyAdminCredentials(username: string, password: string): Promise<{ username: string; credentialVersion: string } | null> {
  if (!credentialsConfigured() || !username.trim() || !password) return null
  await ensureSecuritySchema()
  await ensureBootstrapCredential()
  const canonical = canonicalUsername(username)
  const rows = await getSql()`SELECT username, password_hash FROM admin_credentials WHERE username=${canonical}`
  const credential = rows[0]
  if (!credential || !await bcrypt.compare(password, credential.password_hash)) return null
  return { username: credential.username, credentialVersion: digest(credential.password_hash) }
}

export async function createSession(username: string, credentialVersion: string): Promise<{ token: string; expiresAt: number }> {
  await ensureSecuritySchema()
  const sql = getSql()
  await sql`DELETE FROM admin_sessions WHERE expires_at <= NOW()`
  const token = randomBytes(32).toString('hex')
  const expiresAt = Date.now() + SESSION_SECONDS * 1000
  await sql`INSERT INTO admin_sessions (token_hash, username, credential_version, expires_at) VALUES (${digest(token)}, ${username}, ${credentialVersion}, ${new Date(expiresAt).toISOString()})`
  return { token, expiresAt }
}

export async function getSessionExpiry(req: any): Promise<number | null> {
  const token = sessionToken(req)
  if (!token) return null
  await ensureSecuritySchema()
  const sql = getSql()
  const sessions = await sql`SELECT expires_at, username, credential_version FROM admin_sessions WHERE token_hash=${digest(token)} AND expires_at > NOW()`
  const session = sessions[0]
  if (!session?.username) return null
  const credentials = await sql`SELECT password_hash FROM admin_credentials WHERE username=${session.username}`
  if (!credentials[0] || !sameSecret(session.credential_version, digest(credentials[0].password_hash))) return null
  return new Date(session.expires_at).getTime()
}

export async function getSessionUsername(req: any): Promise<string | null> {
  const token = sessionToken(req)
  if (!token) return null
  await ensureSecuritySchema()
  const sessions = await getSql()`SELECT username FROM admin_sessions WHERE token_hash=${digest(token)} AND expires_at > NOW()`
  return sessions[0]?.username || null
}

export async function revokeSession(req: any) {
  const token = sessionToken(req)
  if (!token) return
  await ensureSecuritySchema()
  await getSql()`DELETE FROM admin_sessions WHERE token_hash=${digest(token)}`
}

export function sameOriginMutation(req: any): boolean {
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  try {
    const origin = new URL(String(req.headers.origin || ''))
    return origin.host === req.headers.host && (origin.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && origin.protocol === 'http:'))
  } catch { return false }
}

export async function authorizeMutation(req: any, res: any): Promise<boolean> {
  res.setHeader?.('Cache-Control', 'no-store')
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) { res.status(405).json({ error: 'Method not allowed' }); return false }
  if (!sameOriginMutation(req)) { res.status(403).json({ error: 'Request not allowed.' }); return false }
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) { res.status(415).json({ error: 'JSON content type is required.' }); return false }
  if (!await getSessionExpiry(req)) { res.status(401).json({ error: 'Please sign in as an administrator.' }); return false }
  return true
}

export async function sharedRateLimited(scope: string, ip: string, limit: number, seconds: number): Promise<boolean> {
  await ensureSecuritySchema()
  const sql = getSql()
  const window = Math.floor(Date.now() / (seconds * 1000))
  const bucket = digest(`${scope}:${ip}:${window}`)
  const expires = new Date((window + 1) * seconds * 1000).toISOString()
  await sql`DELETE FROM api_rate_limits WHERE expires_at <= NOW()`
  const rows = await sql`INSERT INTO api_rate_limits (bucket, count, expires_at) VALUES (${bucket}, 1, ${expires}) ON CONFLICT (bucket) DO UPDATE SET count=api_rate_limits.count + 1 RETURNING count`
  return Number(rows[0].count) > limit
}
