DO $$
BEGIN
  CREATE TYPE "teacher_evaluation_type" AS ENUM (
    'teacher_class',
    'ja_hub',
    'learners_path'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "teacher_evaluation_window_status" AS ENUM (
    'active',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "teacher_evaluation_windows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "class_id" uuid NOT NULL,
  "teacher_id" uuid NOT NULL,
  "school_year" text NOT NULL,
  "grading_period" "grading_period" NOT NULL,
  "evaluation_type" "teacher_evaluation_type" NOT NULL,
  "status" "teacher_evaluation_window_status" NOT NULL DEFAULT 'active',
  "eligible_count" integer NOT NULL DEFAULT 0,
  "opens_at" timestamp NOT NULL DEFAULT now(),
  "closes_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "teacher_evaluation_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "window_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "teacher_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "school_year" text NOT NULL,
  "grading_period" "grading_period" NOT NULL,
  "evaluation_type" "teacher_evaluation_type" NOT NULL,
  "ratings_json" json NOT NULL,
  "comment" text,
  "submitted_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE "teacher_evaluation_windows"
    ADD CONSTRAINT "teacher_evaluation_windows_class_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "teacher_evaluation_windows"
    ADD CONSTRAINT "teacher_evaluation_windows_teacher_id_fk"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "teacher_evaluation_submissions"
    ADD CONSTRAINT "teacher_evaluation_submissions_window_id_fk"
    FOREIGN KEY ("window_id") REFERENCES "teacher_evaluation_windows"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "teacher_evaluation_submissions"
    ADD CONSTRAINT "teacher_evaluation_submissions_class_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "teacher_evaluation_submissions"
    ADD CONSTRAINT "teacher_evaluation_submissions_teacher_id_fk"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "teacher_evaluation_submissions"
    ADD CONSTRAINT "teacher_evaluation_submissions_student_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "teacher_evaluation_windows_class_period_type_unique"
  ON "teacher_evaluation_windows" ("class_id", "school_year", "grading_period", "evaluation_type");

CREATE INDEX IF NOT EXISTS "teacher_evaluation_windows_teacher_idx"
  ON "teacher_evaluation_windows" ("teacher_id");

CREATE INDEX IF NOT EXISTS "teacher_evaluation_windows_class_idx"
  ON "teacher_evaluation_windows" ("class_id");

CREATE INDEX IF NOT EXISTS "teacher_evaluation_windows_period_type_idx"
  ON "teacher_evaluation_windows" ("grading_period", "evaluation_type");

CREATE UNIQUE INDEX IF NOT EXISTS "teacher_evaluation_submissions_student_scope_unique"
  ON "teacher_evaluation_submissions" (
    "student_id",
    "class_id",
    "school_year",
    "grading_period",
    "evaluation_type"
  );

CREATE INDEX IF NOT EXISTS "teacher_evaluation_submissions_window_idx"
  ON "teacher_evaluation_submissions" ("window_id");

CREATE INDEX IF NOT EXISTS "teacher_evaluation_submissions_teacher_idx"
  ON "teacher_evaluation_submissions" ("teacher_id");

CREATE INDEX IF NOT EXISTS "teacher_evaluation_submissions_class_period_idx"
  ON "teacher_evaluation_submissions" ("class_id", "grading_period", "evaluation_type");
