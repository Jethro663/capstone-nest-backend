DO $$
BEGIN
  CREATE TYPE "student_presentation_mode" AS ENUM ('solid', 'gradient', 'preset');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "student_course_view_mode" AS ENUM ('card', 'wide');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "student_class_presentation_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "class_id" uuid NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
  "style_mode" "student_presentation_mode" NOT NULL DEFAULT 'gradient',
  "style_token" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "student_class_presentation_preferences_user_class_unique" UNIQUE("user_id", "class_id")
);

CREATE TABLE IF NOT EXISTS "student_course_view_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "view_mode" "student_course_view_mode" NOT NULL DEFAULT 'card',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "student_course_view_preferences_user_unique" UNIQUE("user_id")
);

CREATE INDEX IF NOT EXISTS "student_class_presentation_preferences_user_idx"
  ON "student_class_presentation_preferences"("user_id");
CREATE INDEX IF NOT EXISTS "student_class_presentation_preferences_class_idx"
  ON "student_class_presentation_preferences"("class_id");
CREATE INDEX IF NOT EXISTS "student_course_view_preferences_user_idx"
  ON "student_course_view_preferences"("user_id");
