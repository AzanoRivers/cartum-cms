import { db } from '@/db'
import { sql } from 'drizzle-orm'

export async function ensureTriggers(): Promise<void> {
  // CREATE OR REPLACE is idempotent — safe to call on every setup/re-setup
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION prevent_users_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      IF current_setting('cartum.allow_user_delete', true) = 'true' THEN
        RETURN OLD;
      END IF;
      RAISE EXCEPTION
        'Users cannot be deleted from cartum. Use cartum_suscriptor = false to revoke access.'
        USING ERRCODE = 'restrict_violation';
    END;
    $$ LANGUAGE plpgsql;
  `)

  // Drop + recreate is idempotent and avoids "trigger already exists" error
  await db.execute(sql`
    DROP TRIGGER IF EXISTS no_delete_users ON users;
  `)

  await db.execute(sql`
    CREATE TRIGGER no_delete_users
    BEFORE DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION prevent_users_delete();
  `)
}
