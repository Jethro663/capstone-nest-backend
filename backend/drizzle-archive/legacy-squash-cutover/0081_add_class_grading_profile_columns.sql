DO $$
BEGIN
  ALTER TABLE "classes"
  ADD COLUMN IF NOT EXISTS "written_work_grading_weight" integer NOT NULL DEFAULT 30;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "classes"
  ADD COLUMN IF NOT EXISTS "performance_task_grading_weight" integer NOT NULL DEFAULT 50;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "classes"
  ADD COLUMN IF NOT EXISTS "quarterly_assessment_grading_weight" integer NOT NULL DEFAULT 20;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;
