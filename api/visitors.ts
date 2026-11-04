import { ensureSchema, getSql, sendError } from './_lib/db.js'
import { endpointRateLimited, getSessionExpiry, sameOriginMutation, sharedRateLimited } from './_lib/security.js'
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
const validVisitorId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)
const indiaDayBounds = (date: string) => {
  const start = new Date(`${date}T00:00:00+05:30`)
  return { start, end: new Date(start.getTime() + 86_400_000) }
}
const headerValue = (req: any, name: string) => {
  const value = req.headers[name]
  const text = String(Array.isArray(value) ? value[0] : value || '').trim()
  try { return decodeURIComponent(text).slice(0, 120) } catch { return text.slice(0, 120) }
}
const visitorLocation = (req: any) => ({
  country: headerValue(req, 'x-vercel-ip-country'),
  region: headerValue(req, 'x-vercel-ip-country-region'),
  city: headerValue(req, 'x-vercel-ip-city'),
  latitude: headerValue(req, 'x-vercel-ip-latitude'),
  longitude: headerValue(req, 'x-vercel-ip-longitude'),
  timezone: headerValue(req, 'x-vercel-ip-timezone'),
})
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
    if (req.method === 'POST' && !sameOriginMutation(req)) return res.status(403).json({ error: 'Request not allowed.' })
    if (req.method === 'GET' && !await getSessionExpiry(req)) return res.status(401).json({ error: 'Unauthorized' })
    await ensureSchema()
    const sql = getSql()

    if (req.method === 'GET') {
      if (await endpointRateLimited(req, res, 'visitors-admin', 120)) return
      const requestedDate = validDate(req.query?.date) ? req.query.date : indiaHourParts().date
      const { start, end } = indiaDayBounds(requestedDate)
      const rows = await sql`SELECT RIGHT(hour_key, 2)::int AS hour, device_type AS device, COUNT(DISTINCT visitor_hash)::int AS count FROM website_visitor_activity WHERE hour_key LIKE ${requestedDate + '-%'} GROUP BY hour, device_type ORDER BY hour`
      const dayVisitors = await sql`SELECT DISTINCT ON (visitor_hash) visitor_hash, device_type AS device FROM website_visitor_activity WHERE hour_key LIKE ${requestedDate + '-%'} ORDER BY visitor_hash, created_at DESC`
      // Daily traffic is the selected day's distinct anonymous browsers: new
      // browser IDs plus IDs first seen on an earlier day that returned today.
      const dailyBreakdown = await sql`
        WITH day_visitors AS (
          SELECT DISTINCT visitor_hash FROM website_visitor_activity WHERE hour_key LIKE ${requestedDate + '-%'}
        )
        SELECT
          COUNT(*) FILTER (WHERE i.created_at >= ${start} AND i.created_at < ${end})::int AS new_total,
          COUNT(*) FILTER (WHERE i.created_at < ${start})::int AS returning_total
        FROM day_visitors d
        JOIN website_visitors i ON i.visitor_hash = d.visitor_hash
      `
      const locations = await sql`
        SELECT
          COALESCE(NULLIF(h.country, ''), i.country) AS country,
          COALESCE(NULLIF(h.region, ''), i.region) AS region,
          COALESCE(NULLIF(h.city, ''), i.city) AS city,
          COALESCE(NULLIF(h.latitude, ''), i.latitude) AS latitude,
          COALESCE(NULLIF(h.longitude, ''), i.longitude) AS longitude,
          COALESCE(NULLIF(h.timezone, ''), i.timezone) AS timezone,
          h.device_type AS device,
          h.created_at AS "lastSeenAt"
        FROM website_visitor_activity h
        JOIN website_visitors i ON i.visitor_hash = h.visitor_hash
        ORDER BY h.created_at DESC
        LIMIT 5000
      `
      const counts = Array.from({ length: 24 }, (_, hour) => ({ hour, count: rows.filter(row => row.hour === hour).reduce((sum, row) => sum + Number(row.count), 0) }))
      const deviceCounts = ['mobile', 'tablet', 'desktop', 'unknown'].map(device => ({ device, count: dayVisitors.filter(row => row.device === device).length }))
      const hourly = counts.map(item => ({ ...item, devices: Object.fromEntries(['mobile', 'tablet', 'desktop', 'unknown'].map(device => [device, Number(rows.find(row => row.hour === item.hour && row.device === device)?.count || 0)])) }))
      const lifetime = await sql`SELECT COUNT(*)::int AS total FROM website_visitors`
      const newVisitors = Number(dailyBreakdown[0]?.new_total || 0)
      const returningVisitors = Number(dailyBreakdown[0]?.returning_total || 0)
      const dailyTraffic = newVisitors + returningVisitors
      return res.status(200).json({ date: requestedDate, hours: hourly, devices: deviceCounts, locations, dailyNew: newVisitors, dailyReturning: returningVisitors, dailyTraffic, total: lifetime[0].total })
    }

    if (req.method === 'POST') {
      const ip = getClientIp(req)
      if (!ip) return res.status(400).json({ error: 'Unable to determine visitor IP.' })
      if (await sharedRateLimited('visitors', ip, 30, 60)) {
        res.setHeader('Retry-After', '60')
        return res.status(429).json({ error: 'Too many visitor requests. Please try again later.' })
      }
      const ipHash = createHash('sha256').update(ip).digest('hex')
      const visitorId = validVisitorId(req.body?.visitorId) ? req.body.visitorId.toLowerCase() : ''
      // Keep old cached clients operational during deployment, while all new
      // clients use the anonymous browser ID as the primary identity.
      const visitorHash = visitorId ? createHash('sha256').update(`browser-v1:${visitorId}`).digest('hex') : `legacy-ip:${ipHash}`
      const legacyHash = `legacy-ip:${ipHash}`
      const location = visitorLocation(req)
      if (visitorId) {
        // Convert one legacy IP identity into its first browser identity. This
        // keeps existing production totals stable through the migration.
        await sql`UPDATE website_visitors SET visitor_hash=${visitorHash} WHERE visitor_hash=${legacyHash} AND NOT EXISTS (SELECT 1 FROM website_visitors WHERE visitor_hash=${visitorHash})`
        await sql`UPDATE website_visitor_activity SET visitor_hash=${visitorHash} WHERE visitor_hash=${legacyHash} AND NOT EXISTS (SELECT 1 FROM website_visitor_activity existing WHERE existing.visitor_hash=${visitorHash} AND existing.hour_key=website_visitor_activity.hour_key)`
        await sql`DELETE FROM website_visitor_activity WHERE visitor_hash=${legacyHash}`
      }
      await sql`INSERT INTO website_visitors (visitor_hash, ip_hash, country, region, city, latitude, longitude, timezone) VALUES (${visitorHash}, ${ipHash}, ${location.country}, ${location.region}, ${location.city}, ${location.latitude}, ${location.longitude}, ${location.timezone}) ON CONFLICT (visitor_hash) DO UPDATE SET ip_hash=EXCLUDED.ip_hash, country=COALESCE(NULLIF(EXCLUDED.country, ''), website_visitors.country), region=COALESCE(NULLIF(EXCLUDED.region, ''), website_visitors.region), city=COALESCE(NULLIF(EXCLUDED.city, ''), website_visitors.city), latitude=COALESCE(NULLIF(EXCLUDED.latitude, ''), website_visitors.latitude), longitude=COALESCE(NULLIF(EXCLUDED.longitude, ''), website_visitors.longitude), timezone=COALESCE(NULLIF(EXCLUDED.timezone, ''), website_visitors.timezone), last_seen_at=NOW()`
      const current = indiaHourParts()
      const hourKey = `${current.date}-${String(current.hour).padStart(2, '0')}`
      // Preserve each hour's location snapshot, while counting each anonymous
      // browser only once during that hour.
      await sql`INSERT INTO website_visitor_activity (hour_key, visitor_hash, ip_hash, device_type, country, region, city, latitude, longitude, timezone) VALUES (${hourKey}, ${visitorHash}, ${ipHash}, ${deviceType(req)}, ${location.country}, ${location.region}, ${location.city}, ${location.latitude}, ${location.longitude}, ${location.timezone}) ON CONFLICT (hour_key, visitor_hash) DO UPDATE SET ip_hash=EXCLUDED.ip_hash, device_type=EXCLUDED.device_type, country=COALESCE(NULLIF(EXCLUDED.country, ''), website_visitor_activity.country), region=COALESCE(NULLIF(EXCLUDED.region, ''), website_visitor_activity.region), city=COALESCE(NULLIF(EXCLUDED.city, ''), website_visitor_activity.city), latitude=COALESCE(NULLIF(EXCLUDED.latitude, ''), website_visitor_activity.latitude), longitude=COALESCE(NULLIF(EXCLUDED.longitude, ''), website_visitor_activity.longitude), timezone=COALESCE(NULLIF(EXCLUDED.timezone, ''), website_visitor_activity.timezone), created_at=NOW()`
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  } catch (error) {
    return sendError(res, error)
  }
}
