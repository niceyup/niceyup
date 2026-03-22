CREATE TABLE "vector_stores" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Unnamed' NOT NULL,
	"provider" text NOT NULL,
	"settings" jsonb,
	"credentials" text,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_indexes" RENAME TO "indexed_sources";--> statement-breakpoint
ALTER TABLE "source_operations" RENAME COLUMN "source_index_id" TO "indexed_source_id";--> statement-breakpoint
ALTER TABLE "indexed_sources" DROP CONSTRAINT "source_indexes_knowledge_base_id_source_id_unique";--> statement-breakpoint
ALTER TABLE "source_operations" DROP CONSTRAINT "source_operations_source_index_id_unique";--> statement-breakpoint
ALTER TABLE "source_operations" DROP CONSTRAINT "exactly_one_owner";--> statement-breakpoint
ALTER TABLE "knowledge_bases" DROP CONSTRAINT "knowledge_bases_agent_id_agents_id_fk";
--> statement-breakpoint
ALTER TABLE "knowledge_bases" DROP CONSTRAINT "knowledge_bases_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "indexed_sources" DROP CONSTRAINT "source_indexes_knowledge_base_id_knowledge_bases_id_fk";
--> statement-breakpoint
ALTER TABLE "indexed_sources" DROP CONSTRAINT "source_indexes_source_id_sources_id_fk";
--> statement-breakpoint
ALTER TABLE "source_operations" DROP CONSTRAINT "source_operations_source_index_id_source_indexes_id_fk";
--> statement-breakpoint
ALTER TABLE "knowledge_bases" ALTER COLUMN "agent_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "authentication" text DEFAULT 'custom' NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "settings" jsonb;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD COLUMN "vector_store_id" text;--> statement-breakpoint
ALTER TABLE "vector_stores" ADD CONSTRAINT "vector_stores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_vector_store_id_vector_stores_id_fk" FOREIGN KEY ("vector_store_id") REFERENCES "public"."vector_stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indexed_sources" ADD CONSTRAINT "indexed_sources_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indexed_sources" ADD CONSTRAINT "indexed_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_operations" ADD CONSTRAINT "source_operations_indexed_source_id_indexed_sources_id_fk" FOREIGN KEY ("indexed_source_id") REFERENCES "public"."indexed_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indexed_sources" ADD CONSTRAINT "indexed_sources_knowledge_base_id_source_id_unique" UNIQUE("knowledge_base_id","source_id");--> statement-breakpoint
ALTER TABLE "source_operations" ADD CONSTRAINT "source_operations_indexed_source_id_unique" UNIQUE("indexed_source_id");--> statement-breakpoint
ALTER TABLE "source_operations" ADD CONSTRAINT "exactly_one_owner" CHECK (("source_operations"."source_id" IS NOT NULL AND "source_operations"."indexed_source_id" IS NULL) OR ("source_operations"."source_id" IS NULL AND "source_operations"."indexed_source_id" IS NOT NULL));