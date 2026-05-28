-- MP-01: Multi-project capsule architecture
-- Adds project isolation to nodes and media, plus membership/settings/invitations tables.

-- 1. Add owner_id to project
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "owner_id" uuid REFERENCES "users"("id") ON DELETE RESTRICT;

-- 2. Add project_id to nodes (nullable first for safe backfill)
ALTER TABLE "nodes" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "project"("id") ON DELETE CASCADE;

-- 3. Backfill nodes from the single existing project
UPDATE "nodes" SET "project_id" = (SELECT "id" FROM "project" LIMIT 1) WHERE "project_id" IS NULL;

-- 4. Make project_id NOT NULL on nodes + index
ALTER TABLE "nodes" ALTER COLUMN "project_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "nodes_project_id_idx" ON "nodes"("project_id");

-- 5. Add project_id to media (nullable first)
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "project"("id") ON DELETE CASCADE;

-- 6. Backfill media from the single existing project
UPDATE "media" SET "project_id" = (SELECT "id" FROM "project" LIMIT 1) WHERE "project_id" IS NULL;

-- 7. Make project_id NOT NULL on media + index
ALTER TABLE "media" ALTER COLUMN "project_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "media_project_id_idx" ON "media"("project_id");

-- 8. Create project_memberships
CREATE TABLE IF NOT EXISTS "project_memberships" (
  "user_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "role_id"    uuid NOT NULL REFERENCES "roles"("id") ON DELETE RESTRICT,
  "joined_at"  timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "project_id")
);

-- 9. Backfill memberships: existing users_roles → existing project
INSERT INTO "project_memberships" ("user_id", "project_id", "role_id", "joined_at")
SELECT ur.user_id, (SELECT id FROM "project" LIMIT 1), ur.role_id, now()
FROM "users_roles" ur
ON CONFLICT DO NOTHING;

-- 10. Create project_settings
CREATE TABLE IF NOT EXISTS "project_settings" (
  "project_id"  uuid NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "key"         text NOT NULL,
  "value"       text NOT NULL,
  "updated_at"  timestamp DEFAULT now() NOT NULL,
  "updated_by"  uuid REFERENCES "users"("id") ON DELETE SET NULL,
  PRIMARY KEY ("project_id", "key")
);

-- 11. Create project_invitations
CREATE TABLE IF NOT EXISTS "project_invitations" (
  "id"             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "project_id"     uuid NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "invited_email"  text NOT NULL,
  "role_id"        uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "invited_by"     uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "token_hash"     text NOT NULL UNIQUE,
  "expires_at"     timestamptz NOT NULL,
  "accepted_at"    timestamptz,
  "created_at"     timestamp DEFAULT now() NOT NULL
);

-- 12. Add project_id to api_tokens (nullable first for backfill)
ALTER TABLE "api_tokens" ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "project"("id") ON DELETE CASCADE;

-- 13. Backfill api_tokens: assign existing tokens to the single existing project
UPDATE "api_tokens" SET "project_id" = (SELECT "id" FROM "project" LIMIT 1) WHERE "project_id" IS NULL;

-- 14. Make project_id NOT NULL on api_tokens
ALTER TABLE "api_tokens" ALTER COLUMN "project_id" SET NOT NULL;
