-- ============================================================
-- Migration: Add Gradebook Module
-- Tables: gradebooks, gradebook_categories, gradebook_items,
--         gradebook_scores, gradebook_final_grades
-- Enums:  grading_period, gradebook_status, gradebook_remarks
-- ============================================================

-- ENUMS
DO $$ BEGIN
  CREATE TYPE "public"."grading_period" AS ENUM('Q1', 'Q2', 'Q3', 'Q4');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."gradebook_status" AS ENUM('draft', 'finalized', 'locked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."gradebook_remarks" AS ENUM('Passed', 'For Intervention');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- TABLE: gradebooks
CREATE TABLE IF NOT EXISTS "gradebooks" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "class_id"       uuid NOT NULL,
  "teacher_id"     uuid NOT NULL,
  "grading_period" "grading_period" NOT NULL,
  "status"         "gradebook_status" NOT NULL DEFAULT 'draft',
  "created_at"     timestamp NOT NULL DEFAULT now(),
  "updated_at"     timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "gradebooks_class_period_unique" UNIQUE ("class_id", "grading_period")
);
--> statement-breakpoint

ALTER TABLE "gradebooks"
  ADD CONSTRAINT "gradebooks_class_id_classes_id_fk"
  FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint

ALTER TABLE "gradebooks"
  ADD CONSTRAINT "gradebooks_teacher_id_users_id_fk"
  FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "gradebooks_teacher_idx" ON "gradebooks" ("teacher_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gradebooks_class_idx" ON "gradebooks" ("class_id");
--> statement-breakpoint

-- TABLE: gradebook_categories
CREATE TABLE IF NOT EXISTS "gradebook_categories" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gradebook_id"       uuid NOT NULL,
  "name"               text NOT NULL,
  "weight_percentage"  numeric(5, 2) NOT NULL,
  "created_at"         timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "gradebook_categories_name_unique" UNIQUE ("gradebook_id", "name")
);
--> statement-breakpoint

ALTER TABLE "gradebook_categories"
  ADD CONSTRAINT "gradebook_categories_gradebook_id_gradebooks_id_fk"
  FOREIGN KEY ("gradebook_id") REFERENCES "public"."gradebooks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "gradebook_categories_gradebook_idx" ON "gradebook_categories" ("gradebook_id");
--> statement-breakpoint

-- TABLE: gradebook_items
CREATE TABLE IF NOT EXISTS "gradebook_items" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gradebook_id"  uuid NOT NULL,
  "category_id"   uuid NOT NULL,
  "assessment_id" uuid,
  "title"         text NOT NULL,
  "max_score"     numeric(8, 2) NOT NULL,
  "date_given"    date,
  "created_at"    timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

ALTER TABLE "gradebook_items"
  ADD CONSTRAINT "gradebook_items_gradebook_id_gradebooks_id_fk"
  FOREIGN KEY ("gradebook_id") REFERENCES "public"."gradebooks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint

ALTER TABLE "gradebook_items"
  ADD CONSTRAINT "gradebook_items_category_id_gradebook_categories_id_fk"
  FOREIGN KEY ("category_id") REFERENCES "public"."gradebook_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint

ALTER TABLE "gradebook_items"
  ADD CONSTRAINT "gradebook_items_assessment_id_assessments_id_fk"
  FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "gradebook_items_gradebook_idx"  ON "gradebook_items" ("gradebook_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gradebook_items_category_idx"   ON "gradebook_items" ("category_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gradebook_items_assessment_idx" ON "gradebook_items" ("assessment_id");
--> statement-breakpoint

-- TABLE: gradebook_scores
CREATE TABLE IF NOT EXISTS "gradebook_scores" (
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gradebook_item_id"    uuid NOT NULL,
  "student_id"           uuid NOT NULL,
  "score"                numeric(8, 2) NOT NULL,
  "recorded_at"          timestamp NOT NULL DEFAULT now(),
  "updated_at"           timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "gradebook_scores_item_student_unique" UNIQUE ("gradebook_item_id", "student_id")
);
--> statement-breakpoint

ALTER TABLE "gradebook_scores"
  ADD CONSTRAINT "gradebook_scores_gradebook_item_id_gradebook_items_id_fk"
  FOREIGN KEY ("gradebook_item_id") REFERENCES "public"."gradebook_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint

ALTER TABLE "gradebook_scores"
  ADD CONSTRAINT "gradebook_scores_student_id_users_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "gradebook_scores_student_idx" ON "gradebook_scores" ("student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gradebook_scores_item_idx"    ON "gradebook_scores" ("gradebook_item_id");
--> statement-breakpoint

-- TABLE: gradebook_final_grades
CREATE TABLE IF NOT EXISTS "gradebook_final_grades" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gradebook_id"      uuid NOT NULL,
  "student_id"        uuid NOT NULL,
  "final_percentage"  numeric(6, 3) NOT NULL,
  "remarks"           "gradebook_remarks" NOT NULL,
  "computed_at"       timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "gradebook_final_grades_gradebook_student_unique" UNIQUE ("gradebook_id", "student_id")
);
--> statement-breakpoint

ALTER TABLE "gradebook_final_grades"
  ADD CONSTRAINT "gradebook_final_grades_gradebook_id_gradebooks_id_fk"
  FOREIGN KEY ("gradebook_id") REFERENCES "public"."gradebooks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint

ALTER TABLE "gradebook_final_grades"
  ADD CONSTRAINT "gradebook_final_grades_student_id_users_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "gradebook_final_grades_gradebook_idx" ON "gradebook_final_grades" ("gradebook_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gradebook_final_grades_student_idx"   ON "gradebook_final_grades" ("student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gradebook_final_grades_remarks_idx"   ON "gradebook_final_grades" ("remarks");
