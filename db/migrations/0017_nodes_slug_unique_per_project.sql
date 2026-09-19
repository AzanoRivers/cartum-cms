ALTER TABLE "nodes" DROP CONSTRAINT "nodes_slug_unique";--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_project_slug_unique" UNIQUE("project_id","slug");