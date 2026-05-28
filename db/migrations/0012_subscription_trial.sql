-- Add subscription columns to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS cartum_suscriptor      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS cartum_suscriptor_time BIGINT  NOT NULL DEFAULT 0;

-- Backfill existing users: use created_at converted to unix ts
UPDATE users
SET cartum_suscriptor_time = EXTRACT(EPOCH FROM created_at)::BIGINT
WHERE cartum_suscriptor_time = 0;

-- Email registry table (persists across user deletes — anti-abuse)
CREATE TABLE IF NOT EXISTS user_email_registry (
  email          TEXT    PRIMARY KEY,
  first_seen_at  BIGINT  NOT NULL,
  trial_start_at BIGINT  NOT NULL,
  trial_days     INTEGER NOT NULL DEFAULT 7
);

-- Populate registry from existing users (one-time backfill)
INSERT INTO user_email_registry (email, first_seen_at, trial_start_at, trial_days)
SELECT
  email,
  EXTRACT(EPOCH FROM created_at)::BIGINT,
  EXTRACT(EPOCH FROM created_at)::BIGINT,
  7
FROM users
ON CONFLICT (email) DO NOTHING;

-- Delete prevention trigger with bypass for authorized full resets
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

CREATE OR REPLACE TRIGGER no_delete_users
BEFORE DELETE ON users
FOR EACH ROW EXECUTE FUNCTION prevent_users_delete();
