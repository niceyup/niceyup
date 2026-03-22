ALTER TABLE "sources" DROP CONSTRAINT "sources_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "knowledge_bases" ALTER COLUMN "status" SET DEFAULT 'ready';--> statement-breakpoint
ALTER TABLE "sources" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;