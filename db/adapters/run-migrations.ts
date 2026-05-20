import path from 'path'

/**
 * Runs all pending Drizzle migrations programmatically.
 * Uses the same adapter as the runtime DB (neon or supabase).
 * Safe to call multiple times — Drizzle tracks applied migrations in __drizzle_migrations.
 */
export async function runMigrations(): Promise<void> {
  const provider          = process.env.DB_PROVIDER ?? 'neon'
  const migrationsFolder  = path.join(process.cwd(), 'db/migrations')

  if (provider === 'supabase') {
    const [{ db }, { migrate }] = await Promise.all([
      import('@/db/adapters/supabase'),
      import('drizzle-orm/postgres-js/migrator'),
    ])
    await migrate(db, { migrationsFolder })
  } else {
    const [{ db }, { migrate }] = await Promise.all([
      import('@/db/adapters/neon'),
      import('drizzle-orm/neon-http/migrator'),
    ])
    await migrate(db, { migrationsFolder })
  }
}
