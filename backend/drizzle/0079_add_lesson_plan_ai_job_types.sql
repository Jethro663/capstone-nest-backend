DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ai_generation_job_type'
      AND e.enumlabel = 'class_lesson_plan_generation'
  ) THEN
    ALTER TYPE ai_generation_job_type ADD VALUE 'class_lesson_plan_generation';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ai_generation_output_type'
      AND e.enumlabel = 'class_lesson_plan'
  ) THEN
    ALTER TYPE ai_generation_output_type ADD VALUE 'class_lesson_plan';
  END IF;
END $$;
