import { neon } from '@neondatabase/serverless'

let schemaPromise
let memberGenderPromise

export function getSql() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE
  ? `postgresql://${encodeURIComponent(process.env.PGUSER)}:${encodeURIComponent(process.env.PGPASSWORD)}@${process.env.PGHOST}/${process.env.PGDATABASE}?sslmode=require`
  : '')
  if (!connectionString) throw new Error('DATABASE_URL or POSTGRES_URL is not configured')
  return neon(connectionString)
}

export async function ensureSchema() {
  if (schemaPromise) return schemaPromise

  const sql = getSql()
  schemaPromise = (async () => {
    await sql`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'YDM Member',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      gender TEXT NOT NULL DEFAULT '',
      seniority TEXT NOT NULL DEFAULT '',
      date_of_birth TEXT NOT NULL DEFAULT '',
      focus TEXT NOT NULL DEFAULT '',
      photo TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    `
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT ''`
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS seniority TEXT NOT NULL DEFAULT ''`
    await sql`
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      present BOOLEAN NOT NULL DEFAULT TRUE,
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(member_id, date)
    )
    `
    await sql`
    CREATE TABLE IF NOT EXISTS system_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
    `
    await sql`
    CREATE TABLE IF NOT EXISTS gallery_photos (
      id TEXT PRIMARY KEY,
      photo TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    `
  })().catch((error) => {
    schemaPromise = undefined
    throw error
  })

  return schemaPromise
}

export async function ensureMemberGenderColumn() {
  if (memberGenderPromise) return memberGenderPromise
  const sql = getSql()
  memberGenderPromise = sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT ''`.catch((error) => {
    memberGenderPromise = undefined
    throw error
  })
  return memberGenderPromise
}

export function sendError(res, error) {
  console.error('Database request failed')
  res.status(500).json({ error: 'Database request failed' })
}
