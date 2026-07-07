ALTER TABLE "classes" DROP CONSTRAINT IF EXISTS "classes_teacher_id_users_id_fk";
ALTER TABLE "classes" ALTER COLUMN "teacher_id" DROP NOT NULL;
ALTER TABLE "classes"
  ADD CONSTRAINT "classes_teacher_id_users_id_fk"
  FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "class_records" DROP CONSTRAINT IF EXISTS "class_records_teacher_id_users_id_fk";
ALTER TABLE "class_records" ALTER COLUMN "teacher_id" DROP NOT NULL;
ALTER TABLE "class_records"
  ADD CONSTRAINT "class_records_teacher_id_users_id_fk"
  FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "teacher_profiles"
  ADD COLUMN IF NOT EXISTS "date_of_birth" timestamp;
ALTER TABLE "teacher_profiles"
  ADD COLUMN IF NOT EXISTS "gender" text;
ALTER TABLE "teacher_profiles"
  ADD COLUMN IF NOT EXISTS "address" text;
