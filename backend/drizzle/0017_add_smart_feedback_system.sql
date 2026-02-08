-- Add smart feedback system columns to assessments table
-- Allows teachers to configure different levels of feedback revelation

ALTER TABLE "assessments" ADD COLUMN "feedback_level" varchar(20) DEFAULT 'standard';
ALTER TABLE "assessments" ADD COLUMN "feedback_delay_hours" integer DEFAULT 24;

-- Create enum type for feedback levels
CREATE TYPE feedback_level AS ENUM ('immediate', 'standard', 'detailed');

-- Update column to use enum
ALTER TABLE "assessments" ALTER COLUMN "feedback_level" SET DATA TYPE feedback_level USING "feedback_level"::feedback_level;

-- Add comment explaining the fields
COMMENT ON COLUMN "assessments"."feedback_level" IS 'immediate: Score only, standard: Answers after delay, detailed: Full feedback with hints after longer delay';
COMMENT ON COLUMN "assessments"."feedback_delay_hours" IS 'Number of hours to delay feedback (0 = immediate)';
