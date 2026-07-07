-- 0025_otp_partial_unique_index.sql
-- Enforce at DB level: only one active (is_used = false) OTP row per user per purpose.
-- Application-level cleanup in createAndSendOTP() remains as a safety net.
CREATE UNIQUE INDEX "otp_active_unique_idx"
  ON "otp_verifications" ("user_id", "purpose")
  WHERE "is_used" = false;
