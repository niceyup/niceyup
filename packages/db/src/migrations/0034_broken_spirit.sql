CREATE TABLE "model_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"type" text DEFAULT 'language-model' NOT NULL,
	"options" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'not-started' NOT NULL,
	"embedding_model_settings_id" text,
	"source_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "models" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "models" CASCADE;--> statement-breakpoint
ALTER TABLE "agents" DROP CONSTRAINT "agents_language_model_id_models_id_fk";
--> statement-breakpoint
ALTER TABLE "agents" DROP CONSTRAINT "agents_embedding_model_id_models_id_fk";
--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_language_model_id_models_id_fk";
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "language_model_settings_id" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "embedding_model_settings_id" text;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "credentials" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "language_model_settings_id" text;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "provider" text NOT NULL;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "credentials" text;--> statement-breakpoint
ALTER TABLE "source_embeddings" ADD CONSTRAINT "source_embeddings_embedding_model_settings_id_model_settings_id_fk" FOREIGN KEY ("embedding_model_settings_id") REFERENCES "public"."model_settings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_embeddings" ADD CONSTRAINT "source_embeddings_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_language_model_settings_id_model_settings_id_fk" FOREIGN KEY ("language_model_settings_id") REFERENCES "public"."model_settings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_embedding_model_settings_id_model_settings_id_fk" FOREIGN KEY ("embedding_model_settings_id") REFERENCES "public"."model_settings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_language_model_settings_id_model_settings_id_fk" FOREIGN KEY ("language_model_settings_id") REFERENCES "public"."model_settings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "language_model_id";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "embedding_model_id";--> statement-breakpoint
ALTER TABLE "connections" DROP COLUMN "payload";--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "language_model_id";--> statement-breakpoint
ALTER TABLE "providers" DROP COLUMN "app";--> statement-breakpoint
ALTER TABLE "providers" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "providers" DROP COLUMN "payload";--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_provider_unique" UNIQUE("provider");