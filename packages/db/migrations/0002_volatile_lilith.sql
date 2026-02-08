CREATE TYPE "public"."ai_alert_type" AS ENUM('budget_warning', 'budget_exceeded', 'anomaly', 'sync_error');--> statement-breakpoint
CREATE TYPE "public"."ai_provider" AS ENUM('openai', 'anthropic');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('active', 'error', 'invalid');--> statement-breakpoint
CREATE TABLE "ai_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "ai_alert_type" NOT NULL,
	"provider" "ai_provider",
	"message" text NOT NULL,
	"details" jsonb,
	"email_sent" boolean DEFAULT false NOT NULL,
	"acknowledged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" "ai_provider",
	"monthly_limit_usd" numeric(10, 2) NOT NULL,
	"alert_threshold_percent" integer DEFAULT 80 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_budgets_user_provider" UNIQUE("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE "ai_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"api_key_hint" text NOT NULL,
	"status" "integration_status" DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_integrations_user_provider" UNIQUE("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE "ai_usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"integration_id" uuid NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"recorded_date" timestamp NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cached_tokens" integer DEFAULT 0 NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_unique" UNIQUE("user_id","provider","recorded_date","model")
);
--> statement-breakpoint
ALTER TABLE "ai_alerts" ADD CONSTRAINT "ai_alerts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_budgets" ADD CONSTRAINT "ai_budgets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_integrations" ADD CONSTRAINT "ai_integrations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_integration_id_ai_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."ai_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_alerts_user_idx" ON "ai_alerts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_budgets_user_idx" ON "ai_budgets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_integrations_user_idx" ON "ai_integrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_usage_user_date_idx" ON "ai_usage_records" USING btree ("user_id","recorded_date");--> statement-breakpoint
CREATE INDEX "ai_usage_provider_idx" ON "ai_usage_records" USING btree ("provider","recorded_date");