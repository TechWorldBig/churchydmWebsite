import { adminLoginRetryAfter, clientIp, credentialsConfigured, endpointRateLimited, getSessionExpiry, revokeSession, sameOriginMutation, sessionCookie } from './_lib/security.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (await endpointRateLimited(req, res, 'auth', 120)) return
    if (req.method === 'GET') {
      const expiresAt = await getSessionExpiry(req)
      const retryAfter = expiresAt || !credentialsConfigured() ? 0 : await adminLoginRetryAfter(clientIp(req))
      return res.status(200).json({ authenticated: Boolean(expiresAt), expiresAt, retryAfter })
    }
    if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })
    if (!sameOriginMutation(req)) return res.status(403).json({ error: 'Request not allowed.' })
    await revokeSession(req)
    res.setHeader('Set-Cookie', sessionCookie('', 0))
    return res.status(200).json({ authenticated: false })
  } catch {
    return res.status(503).json({ error: 'Administrator service is temporarily unavailable.' })
  }
}
