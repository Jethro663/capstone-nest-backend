ALTER TABLE "app_versions" ADD COLUMN "artifact_kind" text;--> statement-breakpoint
ALTER TABLE "app_versions" ADD COLUMN "artifact_download_url" text;--> statement-breakpoint
ALTER TABLE "app_versions" ADD COLUMN "artifact_sha256" text;--> statement-breakpoint
ALTER TABLE "app_versions" ADD COLUMN "artifact_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "app_versions" ADD COLUMN "source_revision" text;--> statement-breakpoint
ALTER TABLE "app_versions" ADD COLUMN "distribution_channel" text;--> statement-breakpoint
UPDATE "app_versions"
SET
  "artifact_kind" = CASE WHEN "platform" = 'ios' THEN 'ipa' ELSE 'apk' END,
  "artifact_download_url" = "apk_download_url",
  "artifact_sha256" = "apk_sha256",
  "artifact_size_bytes" = "apk_size_bytes",
  "distribution_channel" = CASE WHEN "platform" = 'ios' THEN 'sidestore' ELSE 'website' END;--> statement-breakpoint
ALTER TABLE "app_versions" ALTER COLUMN "artifact_kind" SET DEFAULT 'apk';--> statement-breakpoint
ALTER TABLE "app_versions" ALTER COLUMN "artifact_kind" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "app_versions" ALTER COLUMN "artifact_download_url" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "app_versions" ALTER COLUMN "distribution_channel" SET DEFAULT 'website';--> statement-breakpoint
ALTER TABLE "app_versions" ALTER COLUMN "distribution_channel" SET NOT NULL;
