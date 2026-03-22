ALTER TABLE "agents" RENAME COLUMN "title_generation_prompt" TO "title_generation_system_message";--> statement-breakpoint
ALTER TABLE "agents" RENAME COLUMN "suggestion_generation_prompt" TO "suggestion_generation_system_message";--> statement-breakpoint
ALTER TABLE "sources" DROP CONSTRAINT "sources_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "sources" ALTER COLUMN "organization_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "source_indexes" ADD COLUMN "indexed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "content_updated_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;