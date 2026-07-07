-- Migration: 0026_add_uploaded_files
-- Adds the uploaded_files table for PDF module storage

CREATE TABLE "uploaded_files" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "teacher_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "class_id"      uuid NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
  "original_name" varchar(255) NOT NULL,
  "stored_name"   varchar(255) NOT NULL,
  "mime_type"     varchar(100) NOT NULL,
  "size_bytes"    bigint NOT NULL,
  "file_path"     text NOT NULL,
  "uploaded_at"   timestamp NOT NULL DEFAULT now(),
  "deleted_at"    timestamp
);

CREATE INDEX "uploaded_files_teacher_idx"      ON "uploaded_files" ("teacher_id");
CREATE INDEX "uploaded_files_class_idx"        ON "uploaded_files" ("class_id");
CREATE INDEX "uploaded_files_uploaded_at_idx"  ON "uploaded_files" ("uploaded_at");
