import { db } from '@/db'
import { sql } from 'drizzle-orm'

/**
 * Idempotently ensures subscription columns exist on the users table.
 * Uses ADD COLUMN IF NOT EXISTS — safe to call multiple times.
 * Bypasses the Drizzle migration runner (which skips already-tracked migrations).
 */
export async function ensureSchemaColumns(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS cartum_suscriptor      BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS cartum_suscriptor_time BIGINT  NOT NULL DEFAULT 0
  `)

  await db.execute(sql`
    UPDATE users
    SET cartum_suscriptor_time = EXTRACT(EPOCH FROM created_at)::BIGINT
    WHERE cartum_suscriptor_time = 0
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_email_registry (
      email          TEXT    PRIMARY KEY,
      first_seen_at  BIGINT  NOT NULL,
      trial_start_at BIGINT  NOT NULL,
      trial_days     INTEGER NOT NULL DEFAULT 7
    )
  `)

  await db.execute(sql`
    INSERT INTO user_email_registry (email, first_seen_at, trial_start_at, trial_days)
    SELECT
      email,
      EXTRACT(EPOCH FROM created_at)::BIGINT,
      EXTRACT(EPOCH FROM created_at)::BIGINT,
      7
    FROM users
    ON CONFLICT (email) DO NOTHING
  `)
}
