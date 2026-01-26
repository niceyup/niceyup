ALTER TABLE "source_embeddings" RENAME TO "source_indexes";--> statement-breakpoint
ALTER TABLE "source_operations" RENAME COLUMN "source_embedding_id" TO "source_index_id";--> statement-breakpoint
ALTER TABLE "source_indexes" DROP CONSTRAINT "source_embeddings_agent_id_source_id_unique";--> statement-breakpoint
ALTER TABLE "source_operations" DROP CONSTRAINT "source_operations_source_embedding_id_unique";--> statement-breakpoint
ALTER TABLE "source_indexes" DROP CONSTRAINT "source_embeddings_agent_id_agents_id_fk";
--> statement-breakpoint
ALTER TABLE "source_indexes" DROP CONSTRAINT "source_embeddings_source_id_sources_id_fk";
--> statement-breakpoint
ALTER TABLE "source_operations" DROP CONSTRAINT "source_operations_source_embedding_id_source_embeddings_id_fk";
--> statement-breakpoint
ALTER TABLE "source_indexes" ADD CONSTRAINT "source_indexes_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_indexes" ADD CONSTRAINT "source_indexes_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_operations" ADD CONSTRAINT "source_operations_source_index_id_source_indexes_id_fk" FOREIGN KEY ("source_index_id") REFERENCES "public"."source_indexes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_indexes" ADD CONSTRAINT "source_indexes_agent_id_source_id_unique" UNIQUE("agent_id","source_id");--> statement-breakpoint
ALTER TABLE "source_operations" ADD CONSTRAINT "source_operations_source_index_id_unique" UNIQUE("source_index_id");