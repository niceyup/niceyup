ALTER TABLE "files" RENAME COLUMN "organization_id" TO "reference_id";--> statement-breakpoint
ALTER TABLE "files" DROP CONSTRAINT "files_organization_id_organizations_id_fk";
--> statement-breakpoint
DROP INDEX "teamMembers_teamId_userId_uidx";