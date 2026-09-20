import { ensureSchema, getSql, sendError } from './_lib/db.js'
import { getSessionExpiry } from './_lib/security.js'

export default async function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', 'no-store')
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    if (!await getSessionExpiry(req)) return res.status(401).json({ error: 'Please sign in as an administrator.' })
    await ensureSchema()
    const rows = await getSql()`SELECT id, actor, action, entity, entity_id AS "entityId", summary, ip_address AS "ipAddress", created_at AS "createdAt" FROM audit_logs ORDER BY created_at DESC LIMIT 50`
    return res.status(200).json(rows)
  } catch (error) {
    return sendError(res, error)
  }
}
