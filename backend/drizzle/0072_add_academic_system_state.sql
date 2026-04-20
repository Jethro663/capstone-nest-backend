CREATE TABLE IF NOT EXISTS "academic_system_states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "school_year" text NOT NULL,
  "quarter" "grading_period" NOT NULL DEFAULT 'Q1',
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "academic_system_states_school_year_idx"
  ON "academic_system_states" ("school_year");
CREATE INDEX IF NOT EXISTS "academic_system_states_quarter_idx"
  ON "academic_system_states" ("quarter");
CREATE INDEX IF NOT EXISTS "academic_system_states_updated_at_idx"
  ON "academic_system_states" ("updated_at");
