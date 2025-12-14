CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'canceled', 'past_due', 'unpaid');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "subscription_status" "subscription_status";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "current_period_end" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_stripe_customer_id_unique" UNIQUE("stripe_customer_id");