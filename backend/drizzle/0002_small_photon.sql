ALTER TABLE "uploaded_files" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD COLUMN "storage_provider" varchar(50) DEFAULT 'local';--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD COLUMN "storage_bucket" varchar(100);--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "replaced_by_token_hash" text;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "grace_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "rotated_at" timestamp;