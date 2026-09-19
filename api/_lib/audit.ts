import { randomUUID, createHash } from 'node:crypto'
import { ensureSchema, getSql } from './db.js'
import { getSessionUsername } from './security.js'

const clientIp = (req: any) => {
  const forwarded = req.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]
  return String(value || req.headers['x-real-ip'] || req.socket?.remoteAddress || '').trim()
}

const hashIp = (req: any) => {
  const ip = clientIp(req)
  return ip ? createHash('sha256').update(ip).digest('hex') : ''
}

export async function writeAuditLog(req: any, details: { action: string; entity: string; entityId?: string; summary?: string }) {
  await ensureSchema()
  const sql = getSql()
  const actor = await getSessionUsername(req) || 'admin'
  await sql`INSERT INTO audit_logs (id, actor, action, entity, entity_id, summary, ip_hash) VALUES (${randomUUID()}, ${actor}, ${details.action}, ${details.entity}, ${details.entityId || ''}, ${details.summary || ''}, ${hashIp(req)})`
}
