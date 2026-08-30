ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "ai_origin" text;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "ai_generation_output_id" uuid;
