DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'intervention_case_status'
      AND e.enumlabel = 'pending'
  ) THEN
    ALTER TYPE intervention_case_status ADD VALUE 'pending' BEFORE 'active';
  END IF;
END $$;

ALTER TABLE intervention_cases
  ALTER COLUMN status SET DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ai_generation_job_type'
      AND e.enumlabel = 'performance_diagnostics'
  ) THEN
    ALTER TYPE ai_generation_job_type ADD VALUE 'performance_diagnostics';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ai_generation_output_type'
      AND e.enumlabel = 'performance_diagnostic'
  ) THEN
    ALTER TYPE ai_generation_output_type ADD VALUE 'performance_diagnostic';
  END IF;
END $$;

