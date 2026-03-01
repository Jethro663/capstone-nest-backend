-- Migration: Add AI Mentor Module tables
-- Tables: ai_interaction_logs, extracted_modules
-- Enums: ai_session_type, extraction_status

-- ==========================================
-- ENUMS
-- ==========================================

DO $$ BEGIN
  CREATE TYPE "ai_session_type" AS ENUM ('module_extraction', 'mentor_chat', 'mistake_explanation');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "extraction_status" AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- AI INTERACTION LOGS
-- ==========================================

CREATE TABLE IF NOT EXISTS "ai_interaction_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "session_type" "ai_session_type" NOT NULL,
  "input_text" text NOT NULL,
  "output_text" text NOT NULL,
  "model_used" text NOT NULL,
  "context_metadata" json,
  "response_time_ms" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ai_interaction_logs_user_id_idx" ON "ai_interaction_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "ai_interaction_logs_session_type_idx" ON "ai_interaction_logs" ("session_type");
CREATE INDEX IF NOT EXISTS "ai_interaction_logs_created_at_idx" ON "ai_interaction_logs" ("created_at");

-- ==========================================
-- EXTRACTED MODULES
-- ==========================================

CREATE TABLE IF NOT EXISTS "extracted_modules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "file_id" uuid NOT NULL REFERENCES "uploaded_files"("id") ON DELETE CASCADE,
  "class_id" uuid NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
  "teacher_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "raw_text" text NOT NULL,
  "structured_content" json,
  "extraction_status" "extraction_status" NOT NULL DEFAULT 'pending',
  "error_message" text,
  "model_used" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "extracted_modules_file_id_idx" ON "extracted_modules" ("file_id");
CREATE INDEX IF NOT EXISTS "extracted_modules_class_id_idx" ON "extracted_modules" ("class_id");
CREATE INDEX IF NOT EXISTS "extracted_modules_teacher_id_idx" ON "extracted_modules" ("teacher_id");
CREATE INDEX IF NOT EXISTS "extracted_modules_status_idx" ON "extracted_modules" ("extraction_status");
