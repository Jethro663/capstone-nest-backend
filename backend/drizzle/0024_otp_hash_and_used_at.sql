-- 0024_otp_hash_and_used_at.sql
-- 1. Rename the plaintext `code` column to `code_hash`
--    (existing rows become invalid after this migration — run after clearing old OTP rows in non-prod,
--    or alongside a data migration that backfills hashed values if preserving rows is required.)
ALTER TABLE "otp_verifications"
  RENAME COLUMN "code" TO "code_hash";

-- 2. Add nullable `used_at` timestamp — populated when isUsed is set to true
ALTER TABLE "otp_verifications"
  ADD COLUMN "used_at" timestamp;
