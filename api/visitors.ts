import { ensureSchema, getSql, sendError } from './_lib/db.js'
import { getSessionExpiry } from './_lib/security.js'
import { createHash } from 'node:crypto'

const getClientIp = (req: any) => {
  const forwarded = req.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]
  return (value || req.headers['x-real-ip'] || req.socket?.remoteAddress || '').trim()
}

export default async function handler(req: any, res: any) {
  try {
    await ensureSchema()
    const sql = getSql()

    if (req.method === 'GET') {
      if (!await getSessionExpiry(req)) return res.status(401).json({ error: 'Unauthorized' })
      const rows = await sql`SELECT COUNT(*)::int AS total FROM website_visitor_ips`
      return res.status(200).json({ total: rows[0].total })
    }

    if (req.method === 'POST') {
      const ip = getClientIp(req)
      if (!ip) return res.status(400).json({ error: 'Unable to determine visitor IP.' })
      const ipHash = createHash('sha256').update(ip).digest('hex')
      await sql`INSERT INTO website_visitor_ips (ip_hash) VALUES (${ipHash}) ON CONFLICT (ip_hash) DO NOTHING`
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  } catch (error) {
    return sendError(res, error)
  }
}
