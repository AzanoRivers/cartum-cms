import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@/db/schema'

type AnyDb = NeonHttpDatabase<typeof schema> | PostgresJsDatabase<typeof schema>

function getDb(): AnyDb {
  const provider = process.env.DB_PROVIDER

  if (provider === 'supabase') {
    // Dynamic require to avoid loading both drivers at once
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@/db/adapters/supabase').db as AnyDb
  }

  // Default: neon
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/db/adapters/neon').db as AnyDb
}

export const db = getDb()
