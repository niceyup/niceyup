CREATE TABLE "flags" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "flags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "flags_to_organizations" (
	"flag_id" text NOT NULL,
	"organization_id" text NOT NULL,
	CONSTRAINT "flags_to_organizations_flag_id_organization_id_pk" PRIMARY KEY("flag_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'language_model' NOT NULL,
	"model" text NOT NULL,
	"options" jsonb,
	"provider_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teams_to_agents" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "teams_to_agents" CASCADE;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "language_model_id" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "embedding_model_id" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "language_model_id" text;--> statement-breakpoint
ALTER TABLE "flags_to_organizations" ADD CONSTRAINT "flags_to_organizations_flag_id_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."flags"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "flags_to_organizations" ADD CONSTRAINT "flags_to_organizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_language_model_id_models_id_fk" FOREIGN KEY ("language_model_id") REFERENCES "public"."models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_embedding_model_id_models_id_fk" FOREIGN KEY ("embedding_model_id") REFERENCES "public"."models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_language_model_id_models_id_fk" FOREIGN KEY ("language_model_id") REFERENCES "public"."models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "language_model";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "embedding_model";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "reasoning_effort";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "max_tokens";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "temperature";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "top_p";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "frequency_penalty";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "presence_penalty";--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "language_model";--> statement-breakpoint
ALTER TABLE "sources" DROP COLUMN "language_model";--> statement-breakpoint
ALTER TABLE "sources" DROP COLUMN "embedding_model";