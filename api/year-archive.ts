import { getSessionExpiry } from './_lib/security.js'
import { ensureSchema, getSql, sendError } from './_lib/db.js'

export default async function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', 'no-store')
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    if (!await getSessionExpiry(req)) return res.status(401).json({ error: 'Please sign in as an administrator.' })
    await ensureSchema()
    const sql = getSql()
    const year = typeof req.query?.year === 'string' ? req.query.year : ''
    if (year && !/^\d{4}$/u.test(year)) return res.status(400).json({ error: 'Invalid archive year.' })
    const rows = year ? await sql`SELECT year, payload, archived_at AS "archivedAt" FROM yeararchive WHERE year=${year}` : await sql`SELECT year, payload, archived_at AS "archivedAt" FROM yeararchive ORDER BY year DESC`
    return res.status(200).json(rows)
  } catch (error) { return sendError(res, error) }
}
