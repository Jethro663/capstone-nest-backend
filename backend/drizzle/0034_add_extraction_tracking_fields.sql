-- Add 'applied' value to extraction_status enum
ALTER TYPE "extraction_status" ADD VALUE IF NOT EXISTS 'applied';

-- Add tracking columns to extracted_modules
ALTER TABLE "extracted_modules" ADD COLUMN IF NOT EXISTS "is_applied" boolean NOT NULL DEFAULT false;
ALTER TABLE "extracted_modules" ADD COLUMN IF NOT EXISTS "progress_percent" integer NOT NULL DEFAULT 0;
ALTER TABLE "extracted_modules" ADD COLUMN IF NOT EXISTS "total_chunks" integer;
ALTER TABLE "extracted_modules" ADD COLUMN IF NOT EXISTS "processed_chunks" integer NOT NULL DEFAULT 0;

-- Add source_extraction_id to lessons for traceability
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "source_extraction_id" uuid;

-- Index for finding AI-generated lessons by extraction source
CREATE INDEX IF NOT EXISTS "lessons_source_extraction_idx" ON "lessons" ("source_extraction_id");
