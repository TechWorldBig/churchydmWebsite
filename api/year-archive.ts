import { getSessionExpiry } from './_lib/security.js'
import { ensureSchema, getSql, sendError } from './_lib/db.js'

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET' || !await getSessionExpiry(req)) return res.status(401).json({ error: 'Please sign in as an administrator.' })
    await ensureSchema()
    const sql = getSql()
    const year = typeof req.query?.year === 'string' ? req.query.year : ''
    const rows = year ? await sql`SELECT year, payload, archived_at AS "archivedAt" FROM yeararchive WHERE year=${year}` : await sql`SELECT year, payload, archived_at AS "archivedAt" FROM yeararchive ORDER BY year DESC`
    return res.status(200).json(rows)
  } catch (error) { return sendError(res, error) }
}
