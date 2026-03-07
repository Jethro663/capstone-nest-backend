DO $$
BEGIN
  CREATE TYPE "file_scope" AS ENUM ('private', 'general');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "library_folders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "parent_id" uuid,
  "scope" "file_scope" NOT NULL DEFAULT 'private',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "deleted_at" timestamp
);

ALTER TABLE "library_folders"
  DROP CONSTRAINT IF EXISTS "library_folders_parent_id_library_folders_id_fk";

ALTER TABLE "library_folders"
  ADD CONSTRAINT "library_folders_parent_id_library_folders_id_fk"
  FOREIGN KEY ("parent_id") REFERENCES "library_folders"("id") ON DELETE CASCADE;

ALTER TABLE "uploaded_files"
  ALTER COLUMN "class_id" DROP NOT NULL;

ALTER TABLE "uploaded_files"
  ADD COLUMN IF NOT EXISTS "folder_id" uuid,
  ADD COLUMN IF NOT EXISTS "scope" "file_scope" NOT NULL DEFAULT 'private';

ALTER TABLE "uploaded_files"
  DROP CONSTRAINT IF EXISTS "uploaded_files_folder_id_library_folders_id_fk";

ALTER TABLE "uploaded_files"
  ADD CONSTRAINT "uploaded_files_folder_id_library_folders_id_fk"
  FOREIGN KEY ("folder_id") REFERENCES "library_folders"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "library_folders_owner_idx" ON "library_folders" ("owner_id");
CREATE INDEX IF NOT EXISTS "library_folders_parent_idx" ON "library_folders" ("parent_id");
CREATE INDEX IF NOT EXISTS "library_folders_scope_idx" ON "library_folders" ("scope");
CREATE INDEX IF NOT EXISTS "uploaded_files_folder_idx" ON "uploaded_files" ("folder_id");
CREATE INDEX IF NOT EXISTS "uploaded_files_scope_idx" ON "uploaded_files" ("scope");
