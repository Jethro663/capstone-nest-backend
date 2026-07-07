CREATE TABLE IF NOT EXISTS "teacher_profiles" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "department" text,
  "specialization" text,
  "profile_picture" text,
  "contact_number" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "teacher_profiles_user_id_idx" ON "teacher_profiles" ("user_id");
CREATE INDEX IF NOT EXISTS "teacher_profiles_department_idx" ON "teacher_profiles" ("department");

INSERT INTO "teacher_profiles" ("user_id", "created_at", "updated_at")
SELECT u.id, u.created_at, u.updated_at
FROM "users" u
INNER JOIN "user_roles" ur ON ur.user_id = u.id
INNER JOIN "roles" r ON r.id = ur.role_id
WHERE r.name = 'teacher'
ON CONFLICT ("user_id") DO NOTHING;