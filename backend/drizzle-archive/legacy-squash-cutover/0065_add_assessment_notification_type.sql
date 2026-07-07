ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'assessment_assigned';

CREATE UNIQUE INDEX IF NOT EXISTS "notifications_user_type_reference_unique_idx"
ON "notifications" ("user_id", "type", "reference_id")
WHERE "reference_id" IS NOT NULL;
