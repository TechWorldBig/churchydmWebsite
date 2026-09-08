import { getSessionExpiry, revokeSession, sameOriginMutation, sessionCookie } from './_lib/security.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (req.method === 'GET') {
      const expiresAt = await getSessionExpiry(req)
      return res.status(200).json({ authenticated: Boolean(expiresAt), expiresAt })
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
