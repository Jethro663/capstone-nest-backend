-- Refactor assessments module: add maxAttempts, timeLimitMinutes, updatedAt;
-- support multiple attempts; add selectedOptionIds for multi-select responses.

-- 1. Add new columns to assessments table
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "max_attempts" integer NOT NULL DEFAULT 1;
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "time_limit_minutes" integer;
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

-- Change totalPoints default from 100 to 0 (auto-calculated from question points)
ALTER TABLE "assessments" ALTER COLUMN "total_points" SET DEFAULT 0;

-- 2. Add attempt_number column to assessment_attempts
ALTER TABLE "assessment_attempts" ADD COLUMN IF NOT EXISTS "attempt_number" integer NOT NULL DEFAULT 1;

-- 3. Drop old unique constraint (single attempt per student per assessment)
ALTER TABLE "assessment_attempts" DROP CONSTRAINT IF EXISTS "assessment_attempts_student_assessment_unique";

-- 4. Add new unique constraint (student + assessment + attempt number)
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_student_assessment_attempt_unique"
  UNIQUE ("student_id", "assessment_id", "attempt_number");

-- 5. Add selectedOptionIds array column to assessment_responses
ALTER TABLE "assessment_responses" ADD COLUMN IF NOT EXISTS "selected_option_ids" text[];
