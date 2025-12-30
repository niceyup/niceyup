ALTER TABLE "agents" ADD COLUMN "reasoning_effort" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "max_tokens" integer;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "temperature" real;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "top_p" real;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "frequency_penalty" real;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "presence_penalty" real;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "system_message" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "prompt_messages" jsonb;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "suggestions" jsonb;