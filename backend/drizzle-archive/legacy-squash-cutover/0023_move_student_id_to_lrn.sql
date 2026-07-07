-- Move student_id from users table to student_profiles as lrn (Learner Reference Number)
-- LRN format: XXXXXXYYZZZZ (6-digit school ID + 2-digit school year + 4-digit student number)

ALTER TABLE "users" DROP COLUMN IF EXISTS "student_id";

ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "lrn" varchar(12);

CREATE UNIQUE INDEX IF NOT EXISTS "student_profiles_lrn_unique" ON "student_profiles" ("lrn") WHERE "lrn" IS NOT NULL;
