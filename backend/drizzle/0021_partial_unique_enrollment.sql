-- Prevents a student from having more than one section-only enrollment row
-- (classId IS NULL) per section. PostgreSQL treats NULL != NULL in UNIQUE
-- constraints so the existing unique().on(studentId, classId) does not cover
-- this case. A partial index does.
CREATE UNIQUE INDEX IF NOT EXISTS "unique_section_enrollment_no_class"
  ON "enrollments" ("student_id", "section_id")
  WHERE "class_id" IS NULL;
