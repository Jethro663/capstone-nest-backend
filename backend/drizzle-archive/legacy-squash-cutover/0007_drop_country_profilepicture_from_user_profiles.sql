-- Drop unused columns from user_profiles
-- 'country' and 'profile_picture' are not used by the CompleteProfilePage form
ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "country";
ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "profile_picture";
