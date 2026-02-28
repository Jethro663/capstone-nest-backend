-- Migration: Add notifications table
-- 0031_add_notifications.sql

CREATE TYPE "notification_type" AS ENUM (
  'announcement_posted',
  'grade_updated',
  'assessment_due',
  'assessment_graded'
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "notification_type" NOT NULL,
  "reference_id" uuid,
  "title" varchar(255) NOT NULL,
  "body" text NOT NULL,
  "is_read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Fast unread count
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications"("user_id", "is_read") WHERE "is_read" = false;
-- Fast inbox pagination
CREATE INDEX IF NOT EXISTS "notifications_user_created_idx" ON "notifications"("user_id", "created_at" DESC);
