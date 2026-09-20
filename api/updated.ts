import { ensureSchema, getSql, sendError } from './_lib/db.js'

export default async function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const sql = getSql()
    const rows = await sql`SELECT value FROM system_metadata WHERE key='attendance_last_updated'`
    return res.status(200).json({ value: rows[0]?.value || null })
  } catch (error) { return sendError(res, error) }
}
