import { authorizeMutation, endpointRateLimited, getSessionExpiry } from './_lib/security.js'
import { ensureSchema, getSql, sendError } from './_lib/db.js'
import { writeAuditLog } from './_lib/audit.js'

const validText = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const validDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value

export const validAnnualProgram = (program: any): boolean => {
  const rows = Array.isArray(program?.rows) ? program.rows : []
  return validText(program?.id, 100) && /^\d{4}$/u.test(program?.year) && validDate(program?.date) && program.date.slice(0, 4) === program.year && validText(program?.theme, 300)
    && rows.length > 0 && rows.length <= 100 && rows.every((row: any, index: number) => row && typeof row === 'object' && !Array.isArray(row) && row.serialNo === index + 1 && validText(row.programName, 200) && validText(row.memberName, 120))
}

export default async function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', 'no-store')
  try {
    if (req.method === 'DELETE') {
      if (!await authorizeMutation(req, res)) return
      const id = typeof req.body?.id === 'string' ? req.body.id.trim() : ''
      if (!validText(id, 100)) return res.status(400).json({ error: 'Invalid annual program ID.' })
      await ensureSchema()
      const sql = getSql()
      const deleted = await sql`DELETE FROM annual_programs WHERE id=${id} RETURNING year, program_date AS "date"`
      if (!deleted[0]) return res.status(404).json({ error: 'Archived annual program not found.' })
      await writeAuditLog(req, { action: 'delete', entity: 'annual_program', entityId: id, summary: `${deleted[0].year} · ${deleted[0].date}` })
      return res.status(200).json({ ok: true })
    }
    if (req.method === 'POST') {
      if (!await authorizeMutation(req, res)) return
      await ensureSchema()
      const sql = getSql()
      const program = req.body?.annualProgram || {}
      const payloadSize = Buffer.byteLength(JSON.stringify(req.body ?? null), 'utf8')
      if (payloadSize > 64_000) return res.status(413).json({ error: 'Request too large.' })
      if (!validAnnualProgram(program)) return res.status(400).json({ error: 'Invalid annual program data.' })
      await sql`INSERT INTO annual_programs (id, year, program_date, theme, rows) VALUES (${program.id}, ${program.year}, ${program.date}, ${program.theme.trim()}, ${JSON.stringify(program.rows)}::jsonb) ON CONFLICT (id) DO NOTHING`
      await writeAuditLog(req, { action: 'archive', entity: 'annual_program', entityId: program.id, summary: `${program.year} · ${program.date}` })
      return res.status(200).json({ ok: true })
    }
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    if (await endpointRateLimited(req, res, 'year-archive', 120)) return
    if (!await getSessionExpiry(req)) return res.status(401).json({ error: 'Please sign in as an administrator.' })
    await ensureSchema()
    const sql = getSql()
    if (req.query?.annualPrograms === '1') {
      const annualPrograms = await sql`SELECT id, year, program_date AS "date", theme, rows, archived_at AS "archivedAt" FROM annual_programs ORDER BY year DESC, program_date DESC, archived_at DESC`
      return res.status(200).json(annualPrograms)
    }
    const year = typeof req.query?.year === 'string' ? req.query.year : ''
    if (year && !/^\d{4}$/u.test(year)) return res.status(400).json({ error: 'Invalid archive year.' })
    const rows = year ? await sql`SELECT year, payload, archived_at AS "archivedAt" FROM yeararchive WHERE year=${year}` : await sql`SELECT year, payload, archived_at AS "archivedAt" FROM yeararchive ORDER BY year DESC`
    return res.status(200).json(rows)
  } catch (error) { return sendError(res, error) }
}
