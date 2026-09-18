ALTER TABLE "field_meta" DROP CONSTRAINT "field_meta_relation_target_id_nodes_id_fk";
--> statement-breakpoint
ALTER TABLE "field_meta" ADD CONSTRAINT "field_meta_relation_target_id_nodes_id_fk" FOREIGN KEY ("relation_target_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;