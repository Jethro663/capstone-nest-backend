ALTER TABLE uploaded_files
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS uploaded_files_teacher_ai_enabled_lookup_idx
  ON uploaded_files (
    teacher_id,
    ai_enabled,
    scope,
    subject_key,
    grade_level,
    deleted_at
  );
