-- Drop civil_status and course from user_profiles
ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS civil_status,
  DROP COLUMN IF EXISTS course;