ALTER TABLE "source_explorer_nodes" RENAME COLUMN "source_type" TO "flag";--> statement-breakpoint
ALTER TABLE "conversation_explorer_nodes" ADD COLUMN "type" text;--> statement-breakpoint
ALTER TABLE "source_explorer_nodes" ADD COLUMN "type" text;--> statement-breakpoint
ALTER TABLE "source_explorer_nodes" ADD COLUMN "read_only" boolean DEFAULT false NOT NULL;