DO $$ BEGIN
  CREATE TYPE "intervention_case_status" AS ENUM ('active', 'completed', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "lxp_assignment_type" AS ENUM ('lesson_review', 'assessment_retry');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "system_evaluation_target" AS ENUM ('lms', 'lxp', 'ai_mentor', 'intervention', 'overall');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "intervention_cases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "class_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "status" "intervention_case_status" NOT NULL DEFAULT 'active',
  "trigger_source" text NOT NULL DEFAULT 'performance_event',
  "trigger_score" numeric(6,3),
  "threshold_applied" numeric(6,3) NOT NULL,
  "note" text,
  "opened_at" timestamp NOT NULL DEFAULT now(),
  "closed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "intervention_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "case_id" uuid NOT NULL,
  "assignment_type" "lxp_assignment_type" NOT NULL,
  "lesson_id" uuid,
  "assessment_id" uuid,
  "checkpoint_label" text NOT NULL,
  "order_index" integer NOT NULL DEFAULT 0,
  "is_completed" boolean NOT NULL DEFAULT false,
  "completed_at" timestamp,
  "xp_awarded" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "lxp_progress" (
  "student_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "xp_total" integer NOT NULL DEFAULT 0,
  "streak_days" integer NOT NULL DEFAULT 0,
  "checkpoints_completed" integer NOT NULL DEFAULT 0,
  "last_activity_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "lxp_progress_student_class_pk" PRIMARY KEY ("student_id","class_id")
);

CREATE TABLE IF NOT EXISTS "system_evaluations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "submitted_by" uuid NOT NULL,
  "target_module" "system_evaluation_target" NOT NULL,
  "usability_score" integer NOT NULL,
  "functionality_score" integer NOT NULL,
  "performance_score" integer NOT NULL,
  "satisfaction_score" integer NOT NULL,
  "feedback" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "intervention_cases"
    ADD CONSTRAINT "intervention_cases_class_id_classes_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "intervention_cases"
    ADD CONSTRAINT "intervention_cases_student_id_users_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "intervention_assignments"
    ADD CONSTRAINT "intervention_assignments_case_id_intervention_cases_id_fk"
    FOREIGN KEY ("case_id") REFERENCES "public"."intervention_cases"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "intervention_assignments"
    ADD CONSTRAINT "intervention_assignments_lesson_id_lessons_id_fk"
    FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "intervention_assignments"
    ADD CONSTRAINT "intervention_assignments_assessment_id_assessments_id_fk"
    FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "lxp_progress"
    ADD CONSTRAINT "lxp_progress_student_id_users_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "lxp_progress"
    ADD CONSTRAINT "lxp_progress_class_id_classes_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "system_evaluations"
    ADD CONSTRAINT "system_evaluations_submitted_by_users_id_fk"
    FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "intervention_cases_class_student_status_idx"
  ON "intervention_cases" ("class_id", "student_id", "status");
CREATE INDEX IF NOT EXISTS "intervention_cases_student_status_idx"
  ON "intervention_cases" ("student_id", "status");
CREATE INDEX IF NOT EXISTS "intervention_cases_class_status_idx"
  ON "intervention_cases" ("class_id", "status");

CREATE INDEX IF NOT EXISTS "intervention_assignments_case_order_idx"
  ON "intervention_assignments" ("case_id", "order_index");
CREATE INDEX IF NOT EXISTS "intervention_assignments_case_completed_idx"
  ON "intervention_assignments" ("case_id", "is_completed");
CREATE INDEX IF NOT EXISTS "intervention_assignments_lesson_idx"
  ON "intervention_assignments" ("lesson_id");
CREATE INDEX IF NOT EXISTS "intervention_assignments_assessment_idx"
  ON "intervention_assignments" ("assessment_id");

CREATE INDEX IF NOT EXISTS "lxp_progress_class_idx"
  ON "lxp_progress" ("class_id");

CREATE INDEX IF NOT EXISTS "system_evaluations_module_created_idx"
  ON "system_evaluations" ("target_module", "created_at");
CREATE INDEX IF NOT EXISTS "system_evaluations_submitted_by_idx"
  ON "system_evaluations" ("submitted_by");
