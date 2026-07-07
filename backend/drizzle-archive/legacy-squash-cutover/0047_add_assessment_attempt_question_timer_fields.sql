ALTER TABLE assessment_attempts
ADD COLUMN IF NOT EXISTS current_question_started_at timestamp;

ALTER TABLE assessment_attempts
ADD COLUMN IF NOT EXISTS current_question_deadline_at timestamp;

ALTER TABLE assessment_attempts
ADD COLUMN IF NOT EXISTS violation_count integer NOT NULL DEFAULT 0;