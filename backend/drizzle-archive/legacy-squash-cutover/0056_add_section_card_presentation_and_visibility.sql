ALTER TABLE "sections"
ADD COLUMN IF NOT EXISTS "card_banner_url" text;

CREATE TABLE IF NOT EXISTS "section_visibility_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "section_id" uuid NOT NULL REFERENCES "sections"("id") ON DELETE CASCADE,
  "is_hidden" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "section_visibility_preferences_user_idx"
ON "section_visibility_preferences" ("user_id");

CREATE INDEX IF NOT EXISTS "section_visibility_preferences_section_idx"
ON "section_visibility_preferences" ("section_id");

CREATE UNIQUE INDEX IF NOT EXISTS "section_visibility_preferences_user_section_unique"
ON "section_visibility_preferences" ("user_id", "section_id");
