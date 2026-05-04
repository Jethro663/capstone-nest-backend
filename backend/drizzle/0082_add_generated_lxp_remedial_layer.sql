ALTER TYPE "lxp_assignment_type" ADD VALUE IF NOT EXISTS 'generated_lesson_review';
ALTER TYPE "lxp_assignment_type" ADD VALUE IF NOT EXISTS 'guided_assessment';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'lxp_generated_artifact_status'
  ) THEN
    CREATE TYPE "lxp_generated_artifact_status" AS ENUM ('draft', 'approved', 'rejected');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'lxp_guided_attempt_status'
  ) THEN
    CREATE TYPE "lxp_guided_attempt_status" AS ENUM ('in_progress', 'submitted');
  END IF;
END $$;

ALTER TABLE "intervention_assignments"
  ADD COLUMN IF NOT EXISTS "generated_remedial_lesson_id" uuid,
  ADD COLUMN IF NOT EXISTS "generated_guided_assessment_id" uuid;

CREATE TABLE IF NOT EXISTS "lxp_generated_remedial_lessons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "case_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "approval_status" "lxp_generated_artifact_status" NOT NULL DEFAULT 'draft',
  "title" text NOT NULL,
  "summary" text,
  "lesson_body" text NOT NULL,
  "weak_concepts" json NOT NULL,
  "source_lesson_ids" json NOT NULL,
  "source_references" json NOT NULL,
  "approved_by" uuid,
  "approved_at" timestamp,
  "rejected_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "lxp_generated_guided_assessments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "case_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "approval_status" "lxp_generated_artifact_status" NOT NULL DEFAULT 'draft',
  "source_assessment_id" uuid,
  "title" text NOT NULL,
  "description" text,
  "weak_concepts" json NOT NULL,
  "source_references" json NOT NULL,
  "questions" json NOT NULL,
  "formative_summary" text,
  "approved_by" uuid,
  "approved_at" timestamp,
  "rejected_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "lxp_generated_guided_assessment_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "guided_assessment_id" uuid NOT NULL,
  "case_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "assignment_id" uuid NOT NULL,
  "status" "lxp_guided_attempt_status" NOT NULL DEFAULT 'in_progress',
  "current_question_index" integer NOT NULL DEFAULT 0,
  "responses" json NOT NULL DEFAULT '[]'::json,
  "hint_usage" json NOT NULL DEFAULT '[]'::json,
  "score" integer,
  "total_questions" integer NOT NULL DEFAULT 0,
  "correct_count" integer NOT NULL DEFAULT 0,
  "formative_summary" json,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "submitted_at" timestamp,
  "last_activity_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  ALTER TABLE "lxp_generated_remedial_lessons"
    ADD CONSTRAINT "lxp_generated_remedial_lessons_case_id_fk"
    FOREIGN KEY ("case_id") REFERENCES "public"."intervention_cases"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "lxp_generated_remedial_lessons"
    ADD CONSTRAINT "lxp_generated_remedial_lessons_class_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "lxp_generated_remedial_lessons"
    ADD CONSTRAINT "lxp_generated_remedial_lessons_student_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "lxp_generated_remedial_lessons"
    ADD CONSTRAINT "lxp_generated_remedial_lessons_approved_by_fk"
    FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "lxp_generated_guided_assessments"
    ADD CONSTRAINT "lxp_generated_guided_assessments_case_id_fk"
    FOREIGN KEY ("case_id") REFERENCES "public"."intervention_cases"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "lxp_generated_guided_assessments"
    ADD CONSTRAINT "lxp_generated_guided_assessments_class_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "lxp_generated_guided_assessments"
    ADD CONSTRAINT "lxp_generated_guided_assessments_student_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "lxp_generated_guided_assessments"
    ADD CONSTRAINT "lxp_generated_guided_assessments_source_assessment_id_fk"
    FOREIGN KEY ("source_assessment_id") REFERENCES "public"."assessments"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "lxp_generated_guided_assessments"
    ADD CONSTRAINT "lxp_generated_guided_assessments_approved_by_fk"
    FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "lxp_generated_guided_assessment_attempts"
    ADD CONSTRAINT "lxp_generated_guided_attempts_guided_assessment_id_fk"
    FOREIGN KEY ("guided_assessment_id") REFERENCES "public"."lxp_generated_guided_assessments"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "lxp_generated_guided_assessment_attempts"
    ADD CONSTRAINT "lxp_generated_guided_attempts_case_id_fk"
    FOREIGN KEY ("case_id") REFERENCES "public"."intervention_cases"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "lxp_generated_guided_assessment_attempts"
    ADD CONSTRAINT "lxp_generated_guided_attempts_class_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "lxp_generated_guided_assessment_attempts"
    ADD CONSTRAINT "lxp_generated_guided_attempts_student_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "lxp_generated_guided_assessment_attempts"
    ADD CONSTRAINT "lxp_generated_guided_attempts_assignment_id_fk"
    FOREIGN KEY ("assignment_id") REFERENCES "public"."intervention_assignments"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "intervention_assignments"
    ADD CONSTRAINT "intervention_assignments_generated_remedial_lesson_id_fk"
    FOREIGN KEY ("generated_remedial_lesson_id") REFERENCES "public"."lxp_generated_remedial_lessons"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "intervention_assignments"
    ADD CONSTRAINT "intervention_assignments_generated_guided_assessment_id_fk"
    FOREIGN KEY ("generated_guided_assessment_id") REFERENCES "public"."lxp_generated_guided_assessments"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "intervention_assignments_generated_lesson_idx"
  ON "intervention_assignments" ("generated_remedial_lesson_id");
CREATE INDEX IF NOT EXISTS "intervention_assignments_generated_assessment_idx"
  ON "intervention_assignments" ("generated_guided_assessment_id");
CREATE INDEX IF NOT EXISTS "lxp_generated_remedial_lessons_case_idx"
  ON "lxp_generated_remedial_lessons" ("case_id");
CREATE INDEX IF NOT EXISTS "lxp_generated_remedial_lessons_class_idx"
  ON "lxp_generated_remedial_lessons" ("class_id");
CREATE INDEX IF NOT EXISTS "lxp_generated_remedial_lessons_student_idx"
  ON "lxp_generated_remedial_lessons" ("student_id");
CREATE INDEX IF NOT EXISTS "lxp_generated_remedial_lessons_status_idx"
  ON "lxp_generated_remedial_lessons" ("approval_status");
CREATE INDEX IF NOT EXISTS "lxp_generated_guided_assessments_case_idx"
  ON "lxp_generated_guided_assessments" ("case_id");
CREATE INDEX IF NOT EXISTS "lxp_generated_guided_assessments_class_idx"
  ON "lxp_generated_guided_assessments" ("class_id");
CREATE INDEX IF NOT EXISTS "lxp_generated_guided_assessments_student_idx"
  ON "lxp_generated_guided_assessments" ("student_id");
CREATE INDEX IF NOT EXISTS "lxp_generated_guided_assessments_status_idx"
  ON "lxp_generated_guided_assessments" ("approval_status");
CREATE INDEX IF NOT EXISTS "lxp_generated_guided_attempts_guided_assessment_idx"
  ON "lxp_generated_guided_assessment_attempts" ("guided_assessment_id");
CREATE INDEX IF NOT EXISTS "lxp_generated_guided_attempts_case_student_idx"
  ON "lxp_generated_guided_assessment_attempts" ("case_id", "student_id");
CREATE UNIQUE INDEX IF NOT EXISTS "lxp_generated_guided_attempts_assignment_unique"
  ON "lxp_generated_guided_assessment_attempts" ("assignment_id", "student_id");
