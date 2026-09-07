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
    await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS photo_name TEXT NOT NULL DEFAULT ''`
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
    await sql`CREATE TABLE IF NOT EXISTS program_points (id TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE, name TEXT NOT NULL, program TEXT NOT NULL, seniority TEXT NOT NULL DEFAULT '', date TEXT NOT NULL, questions_answered INTEGER NOT NULL DEFAULT 0 CHECK (questions_answered >= 0 AND questions_answered <= 5), score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 5), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`
    await sql`ALTER TABLE program_points ADD COLUMN IF NOT EXISTS seniority TEXT NOT NULL DEFAULT ''`
    await sql`ALTER TABLE program_points ADD COLUMN IF NOT EXISTS questions_answered INTEGER NOT NULL DEFAULT 0`
    await sql`DELETE FROM program_points duplicate USING program_points original WHERE duplicate.member_id = original.member_id AND duplicate.program = original.program AND duplicate.date = original.date AND (duplicate.created_at, duplicate.id) > (original.created_at, original.id)`
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS program_points_member_program_date_idx ON program_points (member_id, program, date)`
    await sql`CREATE TABLE IF NOT EXISTS weekly_programs (id TEXT PRIMARY KEY, date TEXT NOT NULL, serial_no INTEGER NOT NULL CHECK (serial_no >= 1 AND serial_no <= 15), program_name TEXT NOT NULL, member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE, member_name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(date, serial_no))`
    await sql`ALTER TABLE weekly_programs ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`
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
