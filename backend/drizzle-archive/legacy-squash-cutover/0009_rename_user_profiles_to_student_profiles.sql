-- Rename user_profiles to student_profiles and add grade_level
BEGIN;

-- 1) Rename table
ALTER TABLE IF EXISTS user_profiles RENAME TO student_profiles;

-- 2) Rename existing index if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'user_profiles_user_id_idx') THEN
    ALTER INDEX user_profiles_user_id_idx RENAME TO student_profiles_user_id_idx;
  END IF;
END$$;

-- 3) Add new column for grade level (nullable to avoid migration failures)
ALTER TABLE IF EXISTS student_profiles ADD COLUMN IF NOT EXISTS grade_level text;

-- 4) Ensure index on grade_level for faster queries
CREATE INDEX IF NOT EXISTS student_profiles_grade_level_idx ON student_profiles (grade_level);

COMMIT;
