-- Create user_profiles table and migrate data from users

BEGIN;

-- 1) Create new table
CREATE TABLE user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth timestamp,
  gender text,
  civil_status text,
  course text,
  phone text,
  city text,
  country text,
  family_name text,
  family_relationship text,
  family_contact text,
  profile_picture text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- 2) Copy existing data from users into user_profiles
INSERT INTO user_profiles (user_id, date_of_birth, gender, civil_status, course, phone, city, country, family_name, family_relationship, family_contact, profile_picture, created_at, updated_at)
SELECT id, date_of_birth, gender, civil_status, course, phone, city, country, family_name, family_relationship, family_contact, profile_picture, now(), now()
FROM users
WHERE date_of_birth IS NOT NULL
   OR gender IS NOT NULL
   OR civil_status IS NOT NULL
   OR course IS NOT NULL
   OR phone IS NOT NULL
   OR city IS NOT NULL
   OR country IS NOT NULL
   OR family_name IS NOT NULL
   OR family_relationship IS NOT NULL
   OR family_contact IS NOT NULL
   OR profile_picture IS NOT NULL;

-- 3) Drop the now redundant columns from users
ALTER TABLE users
  DROP COLUMN IF EXISTS date_of_birth,
  DROP COLUMN IF EXISTS gender,
  DROP COLUMN IF EXISTS civil_status,
  DROP COLUMN IF EXISTS course,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS family_name,
  DROP COLUMN IF EXISTS family_relationship,
  DROP COLUMN IF EXISTS family_contact,
  DROP COLUMN IF EXISTS profile_picture;

COMMIT;
