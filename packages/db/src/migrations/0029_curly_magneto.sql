CREATE TABLE "providers" (
	"id" text PRIMARY KEY NOT NULL,
	"app" text NOT NULL,
	"name" text DEFAULT 'Unnamed' NOT NULL,
	"payload" text,
	"organization_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation_explorer_nodes" RENAME COLUMN "shared" TO "shared_by_user";--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;