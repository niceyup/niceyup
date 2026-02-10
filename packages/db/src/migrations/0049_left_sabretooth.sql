ALTER TABLE "agents" DROP CONSTRAINT "agents_slug_unique";--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_organization_id_slug_unique" UNIQUE("organization_id","slug");