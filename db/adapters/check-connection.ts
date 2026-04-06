import { sql } from 'drizzle-orm'
import { db } from '@/db'

/**
 * Pings the database. Throws if unreachable.
 */
export async function checkDatabaseConnection(): Promise<void> {
  await db.execute(sql`SELECT 1`)
}
