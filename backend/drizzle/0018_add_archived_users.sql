-- Add archived_users table for storing user data snapshots before permanent deletion
CREATE TABLE IF NOT EXISTS "archived_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "original_user_id" uuid NOT NULL,
  "email" text NOT NULL,
  "full_name" text NOT NULL,
  "role" text NOT NULL,
  "archived_data" jsonb NOT NULL,
  "archived_by" uuid NOT NULL,
  "archived_at" timestamp DEFAULT now() NOT NULL,
  "purged_at" timestamp
);

CREATE INDEX "archived_users_original_user_id_idx" ON "archived_users" ("original_user_id");
CREATE INDEX "archived_users_email_idx" ON "archived_users" ("email");
CREATE INDEX "archived_users_archived_at_idx" ON "archived_users" ("archived_at");
