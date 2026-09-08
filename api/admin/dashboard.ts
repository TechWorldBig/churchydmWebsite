import { getSessionExpiry } from '../_lib/security.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    if (!await getSessionExpiry(req)) return res.status(401).json({ error: 'Unauthorized' })
    res.setHeader('Location', '/admin')
    return res.status(302).end()
  } catch {
    return res.status(503).json({ error: 'Administrator service is temporarily unavailable.' })
  }
}
