import { adminLoginRetryAfter, clearAdminLoginFailures, clientIp, createSession, credentialsConfigured, isJsonContentType, recordAdminLoginFailure, sameOriginMutation, sessionCookie, verifyAdminCredentials } from '../_lib/security.js'

const locked = (res: any, retryAfter: number) => {
  res.setHeader('Retry-After', String(retryAfter))
  return res.status(429).json({ error: 'Too many incorrect attempts. Sign-in is temporarily locked.', retryAfter })
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    if (!sameOriginMutation(req)) return res.status(403).json({ error: 'Request not allowed.' })
    if (!isJsonContentType(req.headers['content-type'])) return res.status(415).json({ error: 'JSON content type is required.' })

    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? null)
    if (Buffer.byteLength(raw) > 4096) return res.status(413).json({ error: 'Request too large.' })
    let body: unknown
    try { body = JSON.parse(raw) } catch { return res.status(400).json({ error: 'Invalid request body.' }) }
    const credentials = body as { username?: unknown; password?: unknown }
    if (typeof credentials.username !== 'string' || typeof credentials.password !== 'string' || credentials.username.length > 128 || credentials.password.length > 512) {
      return res.status(400).json({ error: 'Invalid credentials.' })
    }
    if (!credentialsConfigured()) return res.status(503).json({ error: 'Administrator sign-in is not configured.' })
    const ip = clientIp(req)
    const activeLock = await adminLoginRetryAfter(ip)
    if (activeLock) return locked(res, activeLock)

    const admin = await verifyAdminCredentials(credentials.username, credentials.password)
    if (!admin) {
      const retryAfter = await recordAdminLoginFailure(ip)
      if (retryAfter) return locked(res, retryAfter)
      return res.status(401).json({ error: 'Invalid credentials.' })
    }
    await clearAdminLoginFailures(ip)
    const { token, expiresAt } = await createSession(admin.username, admin.credentialVersion)
    res.setHeader('Set-Cookie', sessionCookie(token))
    return res.status(200).json({ authenticated: true, expiresAt })
  } catch {
    return res.status(503).json({ error: 'Administrator service is temporarily unavailable.' })
  }
}
