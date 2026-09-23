ALTER TABLE "nodes" ADD COLUMN "simple_name" text;--> statement-breakpoint
UPDATE "nodes" SET "simple_name" = lower(regexp_replace("name", '\s+', '', 'g')) WHERE "simple_name" IS NULL;--> statement-breakpoint
CREATE INDEX "nodes_project_simple_name_idx" ON "nodes" USING btree ("project_id","simple_name");