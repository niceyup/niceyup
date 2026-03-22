CREATE TABLE "active_tools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"tool" text NOT NULL,
	"type" text NOT NULL,
	"arguments" jsonb,
	"mcp_server_id" text,
	"agent_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
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
	"organization_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "providers" RENAME TO "model_providers";--> statement-breakpoint
ALTER TABLE "model_settings" RENAME COLUMN "provider" TO "provider_id";--> statement-breakpoint
ALTER TABLE "model_providers" DROP CONSTRAINT "providers_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "model_settings" ALTER COLUMN "type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "top_k" integer;--> statement-breakpoint
ALTER TABLE "model_providers" ADD COLUMN "name" text DEFAULT 'Unnamed' NOT NULL;--> statement-breakpoint
ALTER TABLE "model_providers" ADD COLUMN "settings" jsonb;--> statement-breakpoint
ALTER TABLE "active_tools" ADD CONSTRAINT "active_tools_mcp_server_id_mcp_servers_id_fk" FOREIGN KEY ("mcp_server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_tools" ADD CONSTRAINT "active_tools_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_settings" ADD CONSTRAINT "model_settings_provider_id_model_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."model_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_providers" ADD CONSTRAINT "model_providers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;