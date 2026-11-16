import { randomUUID } from 'node:crypto'
import { ensureSchema, getSql } from './db.js'
import { clientIp, getSessionUsername, hashClientIp } from './security.js'

const hashIp = (req: any) => hashClientIp(clientIp(req), 'audit-log')

export async function writeAuditLog(req: any, details: { action: string; entity: string; entityId?: string; summary?: string }) {
  await ensureSchema()
  const sql = getSql()
  const actor = await getSessionUsername(req) || 'admin'
  await sql`INSERT INTO audit_logs (id, actor, action, entity, entity_id, summary, ip_hash, ip_address) VALUES (${randomUUID()}, ${actor}, ${details.action}, ${details.entity}, ${details.entityId || ''}, ${details.summary || ''}, ${hashIp(req)}, '')`
}
