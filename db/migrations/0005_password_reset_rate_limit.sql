CREATE TABLE IF NOT EXISTS "password_reset_rate_limits" (
  "email_hash"    TEXT PRIMARY KEY NOT NULL,
  "requested_at"  TIMESTAMP WITH TIME ZONE NOT NULL
);
