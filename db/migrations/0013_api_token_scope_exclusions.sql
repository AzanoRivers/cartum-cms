-- Add scope column to api_tokens (allowed operations per token)
ALTER TABLE "api_tokens" ADD COLUMN IF NOT EXISTS "scope" text[] DEFAULT ARRAY['read']::text[] NOT NULL;
--> statement-breakpoint

-- Create api_token_exclusions table (per-token deck access restrictions)
CREATE TABLE IF NOT EXISTS "api_token_exclusions" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token_id"   uuid NOT NULL,
  "node_id"    uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_token_exclusions"
  ADD CONSTRAINT "api_token_exclusions_token_id_api_tokens_id_fk"
  FOREIGN KEY ("token_id") REFERENCES "public"."api_tokens"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "api_token_exclusions"
  ADD CONSTRAINT "api_token_exclusions_node_id_nodes_id_fk"
  FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;
