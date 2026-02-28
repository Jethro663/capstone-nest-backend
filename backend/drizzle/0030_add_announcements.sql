-- Migration: Add announcements table
-- 0030_add_announcements.sql

CREATE TABLE IF NOT EXISTS "announcements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "class_id" uuid NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
  "author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "content" text NOT NULL,
  "is_pinned" boolean NOT NULL DEFAULT false,
  "scheduled_at" timestamp,
  "published_at" timestamp,
  "archived_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "announcements_class_id_idx" ON "announcements"("class_id");
CREATE INDEX IF NOT EXISTS "announcements_author_id_idx" ON "announcements"("author_id");
CREATE INDEX IF NOT EXISTS "announcements_class_published_idx" ON "announcements"("class_id", "published_at");
CREATE INDEX IF NOT EXISTS "announcements_scheduled_pending_idx" ON "announcements"("scheduled_at") WHERE "published_at" IS NULL AND "archived_at" IS NULL;
