DO $$ BEGIN
  CREATE TYPE library_subject_key AS ENUM (
    'math',
    'science',
    'english',
    'filipino',
    'ap',
    'tle',
    'mapeh',
    'esp'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE library_index_status AS ENUM (
    'not_indexed',
    'pending',
    'processing',
    'completed',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE library_file_kind AS ENUM ('pdf', 'txt', 'pptx');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE content_source_type ADD VALUE IF NOT EXISTS 'library_file';

ALTER TABLE uploaded_files
  ADD COLUMN IF NOT EXISTS subject_key library_subject_key,
  ADD COLUMN IF NOT EXISTS grade_level grade_level,
  ADD COLUMN IF NOT EXISTS teacher_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS index_status library_index_status NOT NULL DEFAULT 'not_indexed',
  ADD COLUMN IF NOT EXISTS index_error text,
  ADD COLUMN IF NOT EXISTS indexed_at timestamp,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS file_kind library_file_kind NOT NULL DEFAULT 'pdf';

ALTER TABLE content_chunks
  ALTER COLUMN class_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS library_file_id uuid,
  ADD COLUMN IF NOT EXISTS subject_key library_subject_key,
  ADD COLUMN IF NOT EXISTS grade_level grade_level;

DO $$ BEGIN
  ALTER TABLE content_chunks
    ADD CONSTRAINT content_chunks_library_file_id_uploaded_files_id_fk
    FOREIGN KEY (library_file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS uploaded_files_general_partition_idx
  ON uploaded_files (scope, subject_key, grade_level, teacher_visible, deleted_at);

CREATE INDEX IF NOT EXISTS uploaded_files_index_status_idx
  ON uploaded_files (index_status);

CREATE INDEX IF NOT EXISTS content_chunks_library_file_idx
  ON content_chunks (source_type, library_file_id, subject_key, grade_level);
