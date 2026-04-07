import { neon } from '@neondatabase/serverless'
import { readFileSync, readdirSync } from 'fs'
import { createHash } from 'crypto'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = dirname(new URL('.', import.meta.url).pathname).replace(/^\//, '')
const envPath = join(root, '.env')

// Parse .env manually
const env = readFileSync(envPath, 'utf8')
for (const line of env.split('\n')) {
  const eqIdx = line.indexOf('=')
  if (eqIdx < 1) continue
  const k = line.slice(0, eqIdx).trim()
  const v = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
  if (k && !k.startsWith('#')) process.env[k] = v
}

const sql = neon(process.env.DATABASE_URL)

// Get applied migrations
const applied = await sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations`
const appliedSet = new Set(applied.map(r => r.hash))
console.log('Applied in DB:', applied.length)

// Read all migration files
const migrationsDir = join(root, 'db', 'migrations')
const journal = JSON.parse(readFileSync(join(migrationsDir, 'meta', '_journal.json'), 'utf8'))

let inserted = 0
for (const entry of journal.entries) {
  const sqlFile = readFileSync(join(migrationsDir, `${entry.tag}.sql`), 'utf8')
  const hash = createHash('sha256').update(sqlFile).digest('hex')

  if (appliedSet.has(hash)) {
    console.log(`  skip  ${entry.tag} (already applied)`)
    continue
  }

  await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${String(entry.when)})`
  console.log(`  mark  ${entry.tag} → ${hash.slice(0, 16)}…`)
  inserted++
}

console.log(`\nDone. ${inserted} migration(s) marked as applied.`)
