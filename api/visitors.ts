import { ensureSchema, getSql, sendError } from './_lib/db.js'
import { getSessionExpiry } from './_lib/security.js'
import { createHash } from 'node:crypto'

const getClientIp = (req: any) => {
  const forwarded = req.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]
  return (value || req.headers['x-real-ip'] || req.socket?.remoteAddress || '').trim()
}
const indiaHourParts = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
  const value = (type: string) => parts.find(part => part.type === type)?.value || ''
  return { date: `${value('year')}-${value('month')}-${value('day')}`, hour: Number(value('hour')) }
}
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value)
const deviceType = (req: any): 'mobile' | 'tablet' | 'desktop' | 'unknown' => {
  const agent = String(req.headers['user-agent'] || '').toLowerCase()
  if (!agent) return 'unknown'
  if (/bot|crawler|spider|preview/u.test(agent)) return 'unknown'
  if (/ipad|tablet|playbook|silk/u.test(agent) || (agent.includes('android') && !agent.includes('mobile'))) return 'tablet'
  if (/mobile|iphone|ipod|android|windows phone/u.test(agent)) return 'mobile'
  return 'desktop'
}

export default async function handler(req: any, res: any) {
  try {
    await ensureSchema()
    const sql = getSql()

    if (req.method === 'GET') {
      if (!await getSessionExpiry(req)) return res.status(401).json({ error: 'Unauthorized' })
      const requestedDate = validDate(req.query?.date) ? req.query.date : indiaHourParts().date
      const rows = await sql`SELECT RIGHT(hour_key, 2)::int AS hour, device_type AS device, COUNT(DISTINCT ip_hash)::int AS count FROM website_visitor_hours WHERE hour_key LIKE ${requestedDate + '-%'} GROUP BY hour, device_type ORDER BY hour`
      const dayVisitors = await sql`SELECT DISTINCT ON (ip_hash) ip_hash, device_type AS device FROM website_visitor_hours WHERE hour_key LIKE ${requestedDate + '-%'} ORDER BY ip_hash, created_at DESC`
      const counts = Array.from({ length: 24 }, (_, hour) => ({ hour, count: rows.filter(row => row.hour === hour).reduce((sum, row) => sum + Number(row.count), 0) }))
      const deviceCounts = ['mobile', 'tablet', 'desktop', 'unknown'].map(device => ({ device, count: dayVisitors.filter(row => row.device === device).length }))
      const hourly = counts.map(item => ({ ...item, devices: Object.fromEntries(['mobile', 'tablet', 'desktop', 'unknown'].map(device => [device, Number(rows.find(row => row.hour === item.hour && row.device === device)?.count || 0)])) }))
      const lifetime = await sql`SELECT COUNT(*)::int AS total FROM website_visitor_ips`
      return res.status(200).json({ date: requestedDate, hours: hourly, devices: deviceCounts, dailyTotal: dayVisitors.length, total: lifetime[0].total })
    }

    if (req.method === 'POST') {
      const ip = getClientIp(req)
      if (!ip) return res.status(400).json({ error: 'Unable to determine visitor IP.' })
      const ipHash = createHash('sha256').update(ip).digest('hex')
      await sql`INSERT INTO website_visitor_ips (ip_hash) VALUES (${ipHash}) ON CONFLICT (ip_hash) DO NOTHING`
      const current = indiaHourParts()
      const hourKey = `${current.date}-${String(current.hour).padStart(2, '0')}`
      await sql`INSERT INTO website_visitor_hours (hour_key, ip_hash, device_type) VALUES (${hourKey}, ${ipHash}, ${deviceType(req)}) ON CONFLICT (hour_key, ip_hash) DO NOTHING`
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  } catch (error) {
    return sendError(res, error)
  }
}
