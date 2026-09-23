-- A previous, untracked hand-added constraint with this same name already
-- exists in every already-deployed DB (missing 'help', added before this
-- schema.ts ever declared a check() here) — drop it first so this migration
-- is safe to apply on top of that drift, not just on a from-scratch DB.
ALTER TABLE "role_section_permissions" DROP CONSTRAINT IF EXISTS "role_section_permissions_section_check";--> statement-breakpoint
ALTER TABLE "role_section_permissions" ADD CONSTRAINT "role_section_permissions_section_check" CHECK ("role_section_permissions"."section" IN ('project', 'subscription', 'appearance', 'account', 'email', 'storage', 'users', 'roles', 'api', 'db', 'webMigration', 'info', 'members', 'cartumProjects', 'variables', 'defaults', 'help', 'superDb'));