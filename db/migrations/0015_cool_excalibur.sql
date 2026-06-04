ALTER TABLE "roles" DROP CONSTRAINT "roles_name_project_id_unique";--> statement-breakpoint
ALTER TABLE "roles" DROP CONSTRAINT "roles_project_id_project_id_fk";
--> statement-breakpoint
ALTER TABLE "role_section_permissions" ADD COLUMN "can_actions" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_name_unique" UNIQUE("name");