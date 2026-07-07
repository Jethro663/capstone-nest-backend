-- ============================================================
-- Migration: Refactor gradebook → class_record + assessment enhancements
-- ============================================================

-- 1. New enums for class record category tagging on assessments
DO $$ BEGIN
  CREATE TYPE "class_record_category" AS ENUM ('written_work', 'performance_task', 'quarterly_assessment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add class_record_category and quarter columns to assessments
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "class_record_category" "class_record_category";
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "quarter" "grading_period";

-- 3. Add score return fields to assessment_attempts (MS Teams-like)
ALTER TABLE "assessment_attempts" ADD COLUMN IF NOT EXISTS "is_returned" boolean DEFAULT false;
ALTER TABLE "assessment_attempts" ADD COLUMN IF NOT EXISTS "returned_at" timestamp;
ALTER TABLE "assessment_attempts" ADD COLUMN IF NOT EXISTS "teacher_feedback" text;

-- 4. Rename gradebook tables → class_record tables
ALTER TABLE IF EXISTS "gradebooks" RENAME TO "class_records";
ALTER TABLE IF EXISTS "gradebook_categories" RENAME TO "class_record_categories";
ALTER TABLE IF EXISTS "gradebook_items" RENAME TO "class_record_items";
ALTER TABLE IF EXISTS "gradebook_scores" RENAME TO "class_record_scores";
ALTER TABLE IF EXISTS "gradebook_final_grades" RENAME TO "class_record_final_grades";

-- 5. Rename enum types
ALTER TYPE "gradebook_status" RENAME TO "class_record_status";
ALTER TYPE "gradebook_remarks" RENAME TO "class_record_remarks";

-- 6. Add item_order column to class_record_items (for spreadsheet column ordering)
ALTER TABLE "class_record_items" ADD COLUMN IF NOT EXISTS "item_order" integer DEFAULT 0;

-- 7. Rename indexes on class_records (formerly gradebooks)
ALTER INDEX IF EXISTS "gradebooks_class_period_unique" RENAME TO "class_records_class_period_unique";
ALTER INDEX IF EXISTS "gradebooks_teacher_idx" RENAME TO "class_records_teacher_idx";
ALTER INDEX IF EXISTS "gradebooks_class_idx" RENAME TO "class_records_class_idx";

-- 8. Rename indexes on class_record_categories (formerly gradebook_categories)
ALTER INDEX IF EXISTS "gradebook_categories_gradebook_idx" RENAME TO "class_record_categories_class_record_idx";
ALTER INDEX IF EXISTS "gradebook_categories_name_unique" RENAME TO "class_record_categories_name_unique";

-- 9. Rename indexes on class_record_items (formerly gradebook_items)
ALTER INDEX IF EXISTS "gradebook_items_gradebook_idx" RENAME TO "class_record_items_class_record_idx";
ALTER INDEX IF EXISTS "gradebook_items_category_idx" RENAME TO "class_record_items_category_idx";
ALTER INDEX IF EXISTS "gradebook_items_assessment_idx" RENAME TO "class_record_items_assessment_idx";

-- 10. Rename indexes on class_record_scores (formerly gradebook_scores)
ALTER INDEX IF EXISTS "gradebook_scores_item_student_unique" RENAME TO "class_record_scores_item_student_unique";
ALTER INDEX IF EXISTS "gradebook_scores_student_idx" RENAME TO "class_record_scores_student_idx";
ALTER INDEX IF EXISTS "gradebook_scores_item_idx" RENAME TO "class_record_scores_item_idx";

-- 11. Rename indexes on class_record_final_grades (formerly gradebook_final_grades)
ALTER INDEX IF EXISTS "gradebook_final_grades_gradebook_student_unique" RENAME TO "class_record_final_grades_record_student_unique";
ALTER INDEX IF EXISTS "gradebook_final_grades_gradebook_idx" RENAME TO "class_record_final_grades_record_idx";
ALTER INDEX IF EXISTS "gradebook_final_grades_student_idx" RENAME TO "class_record_final_grades_student_idx";
ALTER INDEX IF EXISTS "gradebook_final_grades_remarks_idx" RENAME TO "class_record_final_grades_remarks_idx";

-- 12. Add index on item_order for class_record_items
CREATE INDEX IF NOT EXISTS "class_record_items_order_idx" ON "class_record_items" ("item_order");

-- 13. Add indexes for the new assessment columns
CREATE INDEX IF NOT EXISTS "assessments_class_record_category_idx" ON "assessments" ("class_record_category");
CREATE INDEX IF NOT EXISTS "assessments_quarter_idx" ON "assessments" ("quarter");
CREATE INDEX IF NOT EXISTS "assessment_attempts_is_returned_idx" ON "assessment_attempts" ("is_returned");
