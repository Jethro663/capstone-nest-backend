CREATE TYPE "public"."feedback_level" AS ENUM('immediate', 'standard', 'detailed');--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "feedback_level" "feedback_level" DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "feedback_delay_hours" integer DEFAULT 24;