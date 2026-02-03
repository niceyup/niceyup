ALTER TABLE "conversations" ADD COLUMN "system_message" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "prompt_messages" jsonb;