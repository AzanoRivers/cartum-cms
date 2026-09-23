'use server'

import { runMigrations } from '@/db/adapters/run-migrations'
import { ensureSchemaColumns } from '@/db/adapters/ensure-schema-columns'
import { ensureTriggers } from '@/db/adapters/ensure-triggers'
import { checkSchemaIntegrity } from '@/db/adapters/check-schema'

/**
 * Re-runs the schema check from the setup wizard's "system-check" step.
 * A fresh reset can hit a transient DB blip (e.g. Neon settling right after
 * a large bulk delete) that clears up on its own within a retry or two.
 */
export async function retrySchemaCheckAction(): Promise<boolean> {
  try {
    await runMigrations()
    await ensureSchemaColumns()
    await ensureTriggers()
    return await checkSchemaIntegrity()
  } catch {
    return false
  }
}
