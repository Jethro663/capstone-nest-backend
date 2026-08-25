ALTER TYPE "public"."library_file_kind" ADD VALUE 'document' BEFORE 'image';--> statement-breakpoint
ALTER TYPE "public"."library_file_kind" ADD VALUE 'file';--> statement-breakpoint
ALTER TABLE "assessment_questions" ALTER COLUMN "concept_tags" SET DATA TYPE jsonb;