import { sql } from 'drizzle-orm'
import { db } from '@/db'

/**
 * Returns true if the `project` table exists — signals migrations have been applied.
 */
export async function checkSchemaIntegrity(): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'project'
    ) AS exists
  `)
  // Neon returns { rows: [...] }, postgres-js returns the array directly
  const rows = Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
  const row = rows[0] as { exists: boolean } | undefined
  return row?.exists === true
}
