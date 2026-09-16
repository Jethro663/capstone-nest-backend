DROP INDEX "notifications_user_visibility_created_idx";--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "dismissed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "notifications_user_visibility_created_idx" ON "notifications" USING btree ("user_id","hidden_at","dismissed_at","created_at");