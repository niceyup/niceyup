DROP TABLE "source_embeddings" CASCADE;--> statement-breakpoint
ALTER TABLE "agents_to_sources" ADD COLUMN "status" text DEFAULT 'not-started' NOT NULL;