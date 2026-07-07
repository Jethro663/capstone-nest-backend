CREATE TABLE IF NOT EXISTS "performance_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "class_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "assessment_average" numeric(6, 3),
  "class_record_average" numeric(6, 3),
  "blended_score" numeric(6, 3),
  "assessment_sample_size" integer DEFAULT 0 NOT NULL,
  "class_record_sample_size" integer DEFAULT 0 NOT NULL,
  "has_data" boolean DEFAULT false NOT NULL,
  "is_at_risk" boolean DEFAULT false NOT NULL,
  "threshold_applied" numeric(6, 3) DEFAULT 74 NOT NULL,
  "last_computed_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "performance_snapshots_class_student_unique" UNIQUE("class_id", "student_id")
);

CREATE TABLE IF NOT EXISTS "performance_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "class_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "previous_is_at_risk" boolean,
  "current_is_at_risk" boolean NOT NULL,
  "assessment_average" numeric(6, 3),
  "class_record_average" numeric(6, 3),
  "blended_score" numeric(6, 3),
  "threshold_applied" numeric(6, 3) NOT NULL,
  "trigger_source" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "performance_snapshots"
    ADD CONSTRAINT "performance_snapshots_class_id_classes_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "performance_snapshots"
    ADD CONSTRAINT "performance_snapshots_student_id_users_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "performance_logs"
    ADD CONSTRAINT "performance_logs_class_id_classes_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "performance_logs"
    ADD CONSTRAINT "performance_logs_student_id_users_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "performance_snapshots_class_risk_idx"
  ON "performance_snapshots" ("class_id", "is_at_risk");
CREATE INDEX IF NOT EXISTS "performance_snapshots_class_student_idx"
  ON "performance_snapshots" ("class_id", "student_id");
CREATE INDEX IF NOT EXISTS "performance_snapshots_class_idx"
  ON "performance_snapshots" ("class_id");
CREATE INDEX IF NOT EXISTS "performance_snapshots_student_idx"
  ON "performance_snapshots" ("student_id");
CREATE INDEX IF NOT EXISTS "performance_logs_class_created_at_idx"
  ON "performance_logs" ("class_id", "created_at");
CREATE INDEX IF NOT EXISTS "performance_logs_class_student_idx"
  ON "performance_logs" ("class_id", "student_id");
CREATE INDEX IF NOT EXISTS "performance_logs_student_created_at_idx"
  ON "performance_logs" ("student_id", "created_at");
