-- Convert subject_grade_level column on classes to enum type grade_level
BEGIN;

-- Normalize values: null out any values not in allowed set
UPDATE classes
SET subject_grade_level = NULL
WHERE subject_grade_level IS NOT NULL AND subject_grade_level NOT IN ('7','8','9','10');

-- Convert column type to grade_level enum
ALTER TABLE IF EXISTS classes
  ALTER COLUMN subject_grade_level TYPE grade_level USING (subject_grade_level::text::grade_level);

-- Ensure index
CREATE INDEX IF NOT EXISTS classes_subject_grade_level_idx ON classes (subject_grade_level);

COMMIT;
