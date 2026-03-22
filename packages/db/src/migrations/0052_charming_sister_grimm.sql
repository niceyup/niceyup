CREATE TABLE "knowledge_bases" (
	"id" text PRIMARY KEY NOT NULL,
	"embedding_model_settings_id" text,
	"top_k" integer,
	"agent_id" text,
	"organization_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "knowledge_bases_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
ALTER TABLE "active_tools" RENAME COLUMN "configuration_id" TO "agent_configuration_id";--> statement-breakpoint
ALTER TABLE "agent_configurations" RENAME COLUMN "enable_source_retrieval_tool" TO "enable_knowledge_base_tool";--> statement-breakpoint
ALTER TABLE "source_indexes" DROP CONSTRAINT "source_indexes_agent_id_source_id_unique";--> statement-breakpoint
ALTER TABLE "conversation_explorer_nodes" DROP CONSTRAINT "exactly_one_owner";--> statement-breakpoint
ALTER TABLE "active_tools" DROP CONSTRAINT "active_tools_configuration_id_agent_configurations_id_fk";
--> statement-breakpoint
ALTER TABLE "agent_configurations" DROP CONSTRAINT "agent_configurations_embedding_model_settings_id_model_settings_id_fk";
--> statement-breakpoint
ALTER TABLE "files" DROP CONSTRAINT "files_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "model_settings" DROP CONSTRAINT "model_settings_configuration_id_agent_configurations_id_fk";
--> statement-breakpoint
ALTER TABLE "source_indexes" DROP CONSTRAINT "source_indexes_agent_id_agents_id_fk";
--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_explorer_nodes" ALTER COLUMN "agent_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "agent_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_servers" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "model_providers" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "source_explorer_nodes" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_configurations" ADD COLUMN "agent_id" text;--> statement-breakpoint
ALTER TABLE "agent_configurations" ADD COLUMN "conversation_id" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "suggestions" jsonb;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "auxiliary_language_model_settings_id" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "title_generation_prompt" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "suggestion_generation_prompt" text;--> statement-breakpoint
ALTER TABLE "model_settings" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "source_indexes" ADD COLUMN "knowledge_base_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_embedding_model_settings_id_model_settings_id_fk" FOREIGN KEY ("embedding_model_settings_id") REFERENCES "public"."model_settings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_tools" ADD CONSTRAINT "active_tools_agent_configuration_id_agent_configurations_id_fk" FOREIGN KEY ("agent_configuration_id") REFERENCES "public"."agent_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_configurations" ADD CONSTRAINT "agent_configurations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_configurations" ADD CONSTRAINT "agent_configurations_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_auxiliary_language_model_settings_id_model_settings_id_fk" FOREIGN KEY ("auxiliary_language_model_settings_id") REFERENCES "public"."model_settings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_settings" ADD CONSTRAINT "model_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_indexes" ADD CONSTRAINT "source_indexes_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_configurations" DROP COLUMN "embedding_model_settings_id";--> statement-breakpoint
ALTER TABLE "agent_configurations" DROP COLUMN "top_k";--> statement-breakpoint
ALTER TABLE "agent_configurations" DROP COLUMN "suggestions";--> statement-breakpoint
ALTER TABLE "model_settings" DROP COLUMN "configuration_id";--> statement-breakpoint
ALTER TABLE "source_indexes" DROP COLUMN "agent_id";--> statement-breakpoint
ALTER TABLE "agent_configurations" ADD CONSTRAINT "agent_configurations_agent_id_unique" UNIQUE("agent_id");--> statement-breakpoint
ALTER TABLE "agent_configurations" ADD CONSTRAINT "agent_configurations_conversation_id_unique" UNIQUE("conversation_id");--> statement-breakpoint
ALTER TABLE "source_indexes" ADD CONSTRAINT "source_indexes_knowledge_base_id_source_id_unique" UNIQUE("knowledge_base_id","source_id");--> statement-breakpoint
ALTER TABLE "agent_configurations" ADD CONSTRAINT "exactly_one_owner" CHECK (("agent_configurations"."agent_id" IS NOT NULL AND "agent_configurations"."conversation_id" IS NULL) OR ("agent_configurations"."agent_id" IS NULL AND "agent_configurations"."conversation_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "conversation_explorer_nodes" ADD CONSTRAINT "exactly_one_owner" CHECK (("conversation_explorer_nodes"."owner_user_id" IS NOT NULL AND "conversation_explorer_nodes"."owner_team_id" IS NULL) OR ("conversation_explorer_nodes"."owner_user_id" IS NULL AND "conversation_explorer_nodes"."owner_team_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "source_operations" ADD CONSTRAINT "exactly_one_owner" CHECK (("source_operations"."source_id" IS NOT NULL AND "source_operations"."source_index_id" IS NULL) OR ("source_operations"."source_id" IS NULL AND "source_operations"."source_index_id" IS NOT NULL));