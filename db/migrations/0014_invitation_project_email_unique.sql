-- Add unique constraint on (project_id, invited_email) so onConflictDoUpdate works correctly.
-- Without this index the upsert in project-invitations.repository.ts fails with 42P10.
CREATE UNIQUE INDEX IF NOT EXISTS "project_invitations_project_email_uidx"
  ON "project_invitations" ("project_id", "invited_email");
