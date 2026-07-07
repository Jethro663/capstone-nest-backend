-- Create grade_level enum and convert existing column to enum type
BEGIN;

-- 1) Create enum type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grade_level') THEN
    CREATE TYPE grade_level AS ENUM ('7','8','9','10');
  END IF;
END$$;

-- 2) Normalize values: NULL out any existing values that are not in the allowed set
UPDATE student_profiles
SET grade_level = NULL
WHERE grade_level IS NOT NULL AND grade_level NOT IN ('7','8','9','10');

-- 3) Convert column type on student_profiles (if table exists)
ALTER TABLE IF EXISTS student_profiles
  ALTER COLUMN grade_level TYPE grade_level USING (grade_level::text::grade_level);

-- 4) Ensure index exists
CREATE INDEX IF NOT EXISTS student_profiles_grade_level_idx ON student_profiles (grade_level);

COMMIT;
