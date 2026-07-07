ALTER TABLE "lxp_generated_guided_assessment_attempts"
  ADD COLUMN IF NOT EXISTS "attempt_number" integer NOT NULL DEFAULT 1;

DROP INDEX IF EXISTS "lxp_generated_guided_attempts_assignment_unique";

CREATE INDEX IF NOT EXISTS "lxp_generated_guided_attempts_assignment_idx"
  ON "lxp_generated_guided_assessment_attempts" ("assignment_id", "student_id");

CREATE UNIQUE INDEX IF NOT EXISTS "lxp_generated_guided_attempts_assignment_attempt_unique"
  ON "lxp_generated_guided_assessment_attempts" ("assignment_id", "student_id", "attempt_number");
