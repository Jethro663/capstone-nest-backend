CREATE TABLE "notification_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"installation_id" uuid NOT NULL,
	"platform" varchar(10) NOT NULL,
	"provider" varchar(20) NOT NULL,
	"push_token_ciphertext" text NOT NULL,
	"token_fingerprint" varchar(64) NOT NULL,
	"app_version" varchar(50) NOT NULL,
	"build_number" integer NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone,
	"disable_reason" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_devices_platform_check" CHECK ("platform" IN ('android', 'ios')),
	CONSTRAINT "notification_devices_provider_check" CHECK ("provider" = 'expo')
);--> statement-breakpoint
ALTER TABLE "notification_devices" ADD CONSTRAINT "notification_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_devices_user_installation_unique_idx" ON "notification_devices" USING btree ("user_id","installation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_devices_active_token_fingerprint_unique_idx" ON "notification_devices" USING btree ("token_fingerprint") WHERE "disabled_at" IS NULL AND "notifications_enabled" = true;--> statement-breakpoint
CREATE INDEX "notification_devices_active_user_idx" ON "notification_devices" USING btree ("user_id","last_seen_at") WHERE "disabled_at" IS NULL AND "notifications_enabled" = true;
