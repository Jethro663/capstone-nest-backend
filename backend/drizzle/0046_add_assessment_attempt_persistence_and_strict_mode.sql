ALTER TABLE "assessments"
  ADD COLUMN IF NOT EXISTS "timed_questions_enabled" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "question_time_limit_seconds" integer,
  ADD COLUMN IF NOT EXISTS "strict_mode" boolean NOT NULL DEFAULT false;

ALTER TABLE "assessment_attempts"
  ADD COLUMN IF NOT EXISTS "expires_at" timestamp,
  ADD COLUMN IF NOT EXISTS "last_question_index" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "question_order" text[],
  ADD COLUMN IF NOT EXISTS "draft_responses" json;

CREATE INDEX IF NOT EXISTS "assessment_attempts_expires_at_idx"
  ON "assessment_attempts" ("expires_at");