CREATE TABLE "billing_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"plans" jsonb,
	"meters" jsonb,
	"limits" jsonb,
	"exchange_rate_multipliers" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "currency" text DEFAULT 'usd' NOT NULL;