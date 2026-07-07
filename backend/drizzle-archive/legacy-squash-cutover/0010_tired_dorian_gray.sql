ALTER TABLE "subjects" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "subjects" CASCADE;--> statement-breakpoint
ALTER TABLE "classes" RENAME COLUMN "subject_id" TO "subject_name";--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "classes_subject_id_section_id_school_year_unique";--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "classes_subject_id_subjects_id_fk";
--> statement-breakpoint
DROP INDEX "classes_subject_idx";--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "subject_code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "subject_grade_level" "grade_level";--> statement-breakpoint
CREATE INDEX "classes_subject_code_idx" ON "classes" USING btree ("subject_code");--> statement-breakpoint
CREATE INDEX "classes_subject_name_idx" ON "classes" USING btree ("subject_name");--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_subject_code_section_id_school_year_unique" UNIQUE("subject_code","section_id","school_year");