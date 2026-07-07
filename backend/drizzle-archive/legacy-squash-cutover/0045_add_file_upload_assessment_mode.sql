DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'assessment_type' AND e.enumlabel = 'file_upload'
  ) THEN
    ALTER TYPE "assessment_type" ADD VALUE 'file_upload';
  END IF;
END$$;

ALTER TABLE "assessments"
  ADD COLUMN IF NOT EXISTS "file_upload_instructions" text,
  ADD COLUMN IF NOT EXISTS "teacher_attachment_file_id" uuid,
  ADD COLUMN IF NOT EXISTS "allowed_upload_mime_types" text[],
  ADD COLUMN IF NOT EXISTS "allowed_upload_extensions" text[],
  ADD COLUMN IF NOT EXISTS "max_upload_size_bytes" integer DEFAULT 104857600;

ALTER TABLE "assessment_attempts"
  ADD COLUMN IF NOT EXISTS "submitted_file_id" uuid,
  ADD COLUMN IF NOT EXISTS "submitted_file_original_name" text,
  ADD COLUMN IF NOT EXISTS "submitted_file_mime_type" varchar(100),
  ADD COLUMN IF NOT EXISTS "submitted_file_size_bytes" bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessments_teacher_attachment_file_id_uploaded_files_id_fk'
  ) THEN
    ALTER TABLE "assessments"
      ADD CONSTRAINT "assessments_teacher_attachment_file_id_uploaded_files_id_fk"
      FOREIGN KEY ("teacher_attachment_file_id")
      REFERENCES "uploaded_files"("id")
      ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessment_attempts_submitted_file_id_uploaded_files_id_fk'
  ) THEN
    ALTER TABLE "assessment_attempts"
      ADD CONSTRAINT "assessment_attempts_submitted_file_id_uploaded_files_id_fk"
      FOREIGN KEY ("submitted_file_id")
      REFERENCES "uploaded_files"("id")
      ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "assessments_teacher_attachment_file_id_idx"
  ON "assessments" ("teacher_attachment_file_id");

CREATE INDEX IF NOT EXISTS "assessment_attempts_submitted_file_id_idx"
  ON "assessment_attempts" ("submitted_file_id");
