CREATE TABLE IF NOT EXISTS "role_section_permissions" (
  "role_id"    uuid    NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "section"    text    NOT NULL,
  "can_access" boolean NOT NULL DEFAULT false,
  PRIMARY KEY ("role_id", "section")
);
