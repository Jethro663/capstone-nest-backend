ALTER TABLE "teacher_profiles"
ADD COLUMN "employee_id" varchar(20);

CREATE UNIQUE INDEX IF NOT EXISTS "teacher_profiles_employee_id_unique"
  ON "teacher_profiles" ("employee_id")
  WHERE "employee_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "teacher_profiles_employee_id_idx"
  ON "teacher_profiles" ("employee_id");
