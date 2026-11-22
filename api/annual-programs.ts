import { authorizeMutation, endpointRateLimited, getSessionExpiry } from './_lib/security.js'
import { ensureSchema, getSql, sendError } from './_lib/db.js'
import { writeAuditLog } from './_lib/audit.js'

const validText = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const validDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(Date.parse(value))

export default async function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', 'no-store')
  try {
    await ensureSchema()
    const sql = getSql()
    if (req.method === 'GET') {
      if (await endpointRateLimited(req, res, 'annual-programs', 120)) return
      if (!await getSessionExpiry(req)) return res.status(401).json({ error: 'Please sign in as an administrator.' })
      const rows = await sql`SELECT id, year, program_date AS "date", theme, rows, archived_at AS "archivedAt" FROM annual_programs ORDER BY year DESC, program_date DESC, archived_at DESC`
      return res.status(200).json(rows)
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    if (!await authorizeMutation(req, res)) return
    const body = req.body || {}
    const programRows = Array.isArray(body.rows) ? body.rows : []
    const validRows = programRows.length > 0 && programRows.length <= 100 && programRows.every((row: any, index: number) => row?.serialNo === index + 1 && validText(row.programName, 200) && validText(row.memberName, 120))
    if (!validText(body.id, 100) || !/^\d{4}$/u.test(body.year) || !validDate(body.date) || body.date.slice(0, 4) !== body.year || !validText(body.theme, 300) || !validRows) return res.status(400).json({ error: 'Invalid annual program data.' })
    await sql`INSERT INTO annual_programs (id, year, program_date, theme, rows) VALUES (${body.id}, ${body.year}, ${body.date}, ${body.theme.trim()}, ${JSON.stringify(programRows)}::jsonb) ON CONFLICT (id) DO NOTHING`
    await writeAuditLog(req, { action: 'archive', entity: 'annual_program', entityId: body.id, summary: `${body.year} · ${body.date}` })
    return res.status(200).json({ ok: true })
  } catch (error) { return sendError(res, error) }
}
