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
ALTER TABLE "agents" DROP CONSTRAINT "agents_auxiliary_language_model_settings_id_model_settings_id_fk";
--> statement-breakpoint
ALTER TABLE "agent_system_configurations" ADD CONSTRAINT "agent_system_configurations_auxiliary_language_model_settings_id_model_settings_id_fk" FOREIGN KEY ("auxiliary_language_model_settings_id") REFERENCES "public"."model_settings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_system_configurations" ADD CONSTRAINT "agent_system_configurations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "suggestions";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "auxiliary_language_model_settings_id";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "title_generation_system_message";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "suggestion_generation_system_message";