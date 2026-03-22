CREATE TABLE "agent_configurations" (
	"id" text PRIMARY KEY NOT NULL,
	"language_model_settings_id" text,
	"embedding_model_settings_id" text,
	"system_message" text,
	"prompt_messages" jsonb,
	"top_k" integer,
	"suggestions" jsonb,
	"enable_source_retrieval_tool" boolean DEFAULT false,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "active_tools" DROP CONSTRAINT "active_tools_agent_id_agents_id_fk";
--> statement-breakpoint
ALTER TABLE "agents" DROP CONSTRAINT "agents_language_model_settings_id_model_settings_id_fk";
--> statement-breakpoint
ALTER TABLE "agents" DROP CONSTRAINT "agents_embedding_model_settings_id_model_settings_id_fk";
--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_language_model_settings_id_model_settings_id_fk";
--> statement-breakpoint
ALTER TABLE "model_settings" DROP CONSTRAINT "model_settings_provider_id_model_providers_id_fk";
--> statement-breakpoint
ALTER TABLE "model_settings" ALTER COLUMN "provider_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "active_tools" ADD COLUMN "configuration_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "model_settings" ADD COLUMN "configuration_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_configurations" ADD CONSTRAINT "agent_configurations_language_model_settings_id_model_settings_id_fk" FOREIGN KEY ("language_model_settings_id") REFERENCES "public"."model_settings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_configurations" ADD CONSTRAINT "agent_configurations_embedding_model_settings_id_model_settings_id_fk" FOREIGN KEY ("embedding_model_settings_id") REFERENCES "public"."model_settings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_tools" ADD CONSTRAINT "active_tools_configuration_id_agent_configurations_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "public"."agent_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_settings" ADD CONSTRAINT "model_settings_configuration_id_agent_configurations_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "public"."agent_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_settings" ADD CONSTRAINT "model_settings_provider_id_model_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."model_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_tools" DROP COLUMN "agent_id";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "language_model_settings_id";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "embedding_model_settings_id";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "system_message";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "prompt_messages";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "top_k";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "suggestions";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "enable_source_retrieval_tool";--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "language_model_settings_id";--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "system_message";--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "prompt_messages";--> statement-breakpoint
ALTER TABLE "conversation_explorer_nodes" ADD CONSTRAINT "exactly_one_owner" CHECK (("conversation_explorer_nodes"."agent_id" IS NOT NULL AND "conversation_explorer_nodes"."conversation_id" IS NULL) OR ("conversation_explorer_nodes"."agent_id" IS NULL AND "conversation_explorer_nodes"."conversation_id" IS NOT NULL));