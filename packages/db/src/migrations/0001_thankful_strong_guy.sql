CREATE TABLE "active_tools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"tool" text NOT NULL,
	"type" text NOT NULL,
	"arguments" jsonb,
	"mcp_server_id" text,
	"agent_configuration_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_configurations" (
	"id" text PRIMARY KEY NOT NULL,
	"language_model_settings_id" text,
	"system_message" text,
	"prompt_messages" jsonb,
	"enable_knowledge_base_tool" boolean DEFAULT false,
	"agent_id" text,
	"conversation_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "agent_configurations_agent_id_unique" UNIQUE("agent_id"),
	CONSTRAINT "agent_configurations_conversation_id_unique" UNIQUE("conversation_id"),
	CONSTRAINT "exactly_one_owner" CHECK (("agent_configurations"."agent_id" IS NOT NULL AND "agent_configurations"."conversation_id" IS NULL) OR ("agent_configurations"."agent_id" IS NULL AND "agent_configurations"."conversation_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "agent_system_configurations" (
	"id" text PRIMARY KEY NOT NULL,
	"auxiliary_language_model_settings_id" text,
	"title_generation_system_message" text,
	"suggestions" jsonb,
	"agent_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "agent_system_configurations_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Unnamed' NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"description" text,
	"tags" text[],
	"published" boolean DEFAULT false NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "agents_organization_id_slug_unique" UNIQUE("organization_id","slug")
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Unnamed' NOT NULL,
	"app" text NOT NULL,
	"authentication" text DEFAULT 'custom' NOT NULL,
	"settings" jsonb,
	"credentials" text,
	"tokens" text,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_explorer_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"type" text,
	"parent_id" text,
	"fractional_index" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"shared_by_user" boolean DEFAULT false NOT NULL,
	"agent_id" text NOT NULL,
	"conversation_id" text,
	"owner_user_id" text,
	"owner_team_id" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "exactly_one_owner" CHECK (("conversation_explorer_nodes"."owner_user_id" IS NOT NULL AND "conversation_explorer_nodes"."owner_team_id" IS NULL) OR ("conversation_explorer_nodes"."owner_user_id" IS NULL AND "conversation_explorer_nodes"."owner_team_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'New conversation' NOT NULL,
	"agent_id" text NOT NULL,
	"team_id" text,
	"created_by_user_id" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "database_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"dialect" text NOT NULL,
	"tables_metadata" jsonb,
	"query_examples" jsonb,
	"source_id" text NOT NULL,
	"file_id" text,
	"connection_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "database_sources_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "file_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"file_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "file_sources_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"file_mime_type" text NOT NULL,
	"file_size" bigint NOT NULL,
	"file_path" text NOT NULL,
	"bucket" text NOT NULL,
	"scope" text NOT NULL,
	"metadata" jsonb,
	"reference_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "indexed_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"indexed_at" timestamp with time zone,
	"knowledge_base_id" text NOT NULL,
	"source_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "indexed_sources_knowledge_base_id_source_id_unique" UNIQUE("knowledge_base_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "knowledge_bases" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"vector_store_id" text,
	"embedding_model_settings_id" text,
	"top_k" integer,
	"agent_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "knowledge_bases_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "mcp_servers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Unnamed' NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"headers" jsonb,
	"credentials" text,
	"connection_id" text,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"parts" jsonb,
	"metadata" jsonb,
	"conversation_id" text NOT NULL,
	"author_id" text,
	"parent_id" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_providers" (
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
CREATE TABLE "model_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"type" text NOT NULL,
	"options" jsonb,
	"provider_id" text,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "participants_conversation_id_user_id_unique" UNIQUE("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "question_answer_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"questions" jsonb NOT NULL,
	"answer" text NOT NULL,
	"source_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "question_answer_sources_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "source_explorer_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"type" text,
	"parent_id" text,
	"fractional_index" text,
	"flag" text,
	"read_only" boolean DEFAULT false NOT NULL,
	"source_id" text,
	"organization_id" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"source_id" text,
	"indexed_source_id" text,
	"error" jsonb,
	"attempts" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "source_operations_source_id_unique" UNIQUE("source_id"),
	CONSTRAINT "source_operations_indexed_source_id_unique" UNIQUE("indexed_source_id"),
	CONSTRAINT "exactly_one_owner" CHECK (("source_operations"."source_id" IS NOT NULL AND "source_operations"."indexed_source_id" IS NULL) OR ("source_operations"."source_id" IS NULL AND "source_operations"."indexed_source_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Unnamed' NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"chunk_size" integer,
	"chunk_overlap" integer,
	"content_updated_at" timestamp with time zone NOT NULL,
	"organization_id" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "text_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"source_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "text_sources_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
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
CREATE TABLE "website_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"source_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "website_sources_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
ALTER TABLE "active_tools" ADD CONSTRAINT "active_tools_mcp_server_id_mcp_servers_id_fk" FOREIGN KEY ("mcp_server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_tools" ADD CONSTRAINT "active_tools_agent_configuration_id_agent_configurations_id_fk" FOREIGN KEY ("agent_configuration_id") REFERENCES "public"."agent_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_configurations" ADD CONSTRAINT "agent_configurations_language_model_settings_id_model_settings_id_fk" FOREIGN KEY ("language_model_settings_id") REFERENCES "public"."model_settings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_configurations" ADD CONSTRAINT "agent_configurations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_configurations" ADD CONSTRAINT "agent_configurations_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_system_configurations" ADD CONSTRAINT "agent_system_configurations_auxiliary_language_model_settings_id_model_settings_id_fk" FOREIGN KEY ("auxiliary_language_model_settings_id") REFERENCES "public"."model_settings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_system_configurations" ADD CONSTRAINT "agent_system_configurations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_explorer_nodes" ADD CONSTRAINT "conversation_explorer_nodes_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_explorer_nodes" ADD CONSTRAINT "conversation_explorer_nodes_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_explorer_nodes" ADD CONSTRAINT "conversation_explorer_nodes_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_explorer_nodes" ADD CONSTRAINT "conversation_explorer_nodes_owner_team_id_teams_id_fk" FOREIGN KEY ("owner_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "database_sources" ADD CONSTRAINT "database_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "database_sources" ADD CONSTRAINT "database_sources_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "database_sources" ADD CONSTRAINT "database_sources_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_sources" ADD CONSTRAINT "file_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_sources" ADD CONSTRAINT "file_sources_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flags_to_organizations" ADD CONSTRAINT "flags_to_organizations_flag_id_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."flags"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "flags_to_organizations" ADD CONSTRAINT "flags_to_organizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "indexed_sources" ADD CONSTRAINT "indexed_sources_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indexed_sources" ADD CONSTRAINT "indexed_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_vector_store_id_vector_stores_id_fk" FOREIGN KEY ("vector_store_id") REFERENCES "public"."vector_stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_embedding_model_settings_id_model_settings_id_fk" FOREIGN KEY ("embedding_model_settings_id") REFERENCES "public"."model_settings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_providers" ADD CONSTRAINT "model_providers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_settings" ADD CONSTRAINT "model_settings_provider_id_model_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."model_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_settings" ADD CONSTRAINT "model_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_answer_sources" ADD CONSTRAINT "question_answer_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_explorer_nodes" ADD CONSTRAINT "source_explorer_nodes_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_explorer_nodes" ADD CONSTRAINT "source_explorer_nodes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_operations" ADD CONSTRAINT "source_operations_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_operations" ADD CONSTRAINT "source_operations_indexed_source_id_indexed_sources_id_fk" FOREIGN KEY ("indexed_source_id") REFERENCES "public"."indexed_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_sources" ADD CONSTRAINT "text_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vector_stores" ADD CONSTRAINT "vector_stores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_sources" ADD CONSTRAINT "website_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;