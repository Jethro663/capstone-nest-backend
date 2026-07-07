CREATE TABLE "app_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text DEFAULT 'android' NOT NULL,
	"version_code" integer NOT NULL,
	"min_supported_version_code" integer NOT NULL,
	"native_version" text NOT NULL,
	"ota_runtime_version" text NOT NULL,
	"apk_download_url" text NOT NULL,
	"apk_sha256" text,
	"apk_size_bytes" integer,
	"is_force_update" boolean DEFAULT false NOT NULL,
	"requires_full_apk" boolean DEFAULT false NOT NULL,
	"release_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "app_versions_platform_idx" ON "app_versions" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "app_versions_version_code_idx" ON "app_versions" USING btree ("version_code");