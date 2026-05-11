DO $$
BEGIN
  CREATE TYPE "public"."system_evaluation_form_type" AS ENUM('system', 'ja_hub');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "public"."system_evaluation_audience_role" AS ENUM('student', 'teacher');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "public"."system_evaluation_campaign_status" AS ENUM('draft', 'active', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "public"."system_evaluation_assignment_status" AS ENUM('pending', 'submitted', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "system_evaluation_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_by" uuid NOT NULL,
  "form_type" "system_evaluation_form_type" NOT NULL,
  "target_module" "system_evaluation_target" NOT NULL,
  "audience_role" "system_evaluation_audience_role" NOT NULL,
  "class_id" uuid,
  "title" text NOT NULL,
  "starts_at" timestamp NOT NULL,
  "ends_at" timestamp NOT NULL,
  "status" "system_evaluation_campaign_status" DEFAULT 'draft' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "system_evaluation_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL,
  "respondent_id" uuid NOT NULL,
  "respondent_role" "system_evaluation_audience_role" NOT NULL,
  "status" "system_evaluation_assignment_status" DEFAULT 'pending' NOT NULL,
  "submitted_evaluation_id" uuid,
  "submitted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "system_evaluations" ADD COLUMN IF NOT EXISTS "campaign_id" uuid;
ALTER TABLE "system_evaluations" ADD COLUMN IF NOT EXISTS "overall_score" integer;
ALTER TABLE "system_evaluations" ADD COLUMN IF NOT EXISTS "question_ratings_json" json;

DO $$
BEGIN
  ALTER TABLE "system_evaluation_campaigns"
    ADD CONSTRAINT "system_evaluation_campaigns_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "system_evaluation_campaigns"
    ADD CONSTRAINT "system_evaluation_campaigns_class_id_classes_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "system_evaluation_assignments"
    ADD CONSTRAINT "system_evaluation_assignments_campaign_id_campaigns_id_fk"
    FOREIGN KEY ("campaign_id") REFERENCES "system_evaluation_campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "system_evaluation_assignments"
    ADD CONSTRAINT "system_evaluation_assignments_respondent_id_users_id_fk"
    FOREIGN KEY ("respondent_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "system_evaluation_assignments"
    ADD CONSTRAINT "system_evaluation_assignments_submitted_evaluation_id_system_evaluations_id_fk"
    FOREIGN KEY ("submitted_evaluation_id") REFERENCES "system_evaluations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "system_evaluations"
    ADD CONSTRAINT "system_evaluations_campaign_id_campaigns_id_fk"
    FOREIGN KEY ("campaign_id") REFERENCES "system_evaluation_campaigns"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "system_evaluations_campaign_idx"
  ON "system_evaluations" USING btree ("campaign_id");
CREATE INDEX IF NOT EXISTS "system_evaluation_campaigns_status_idx"
  ON "system_evaluation_campaigns" USING btree ("status");
CREATE INDEX IF NOT EXISTS "system_evaluation_campaigns_form_audience_idx"
  ON "system_evaluation_campaigns" USING btree ("form_type", "audience_role");
CREATE INDEX IF NOT EXISTS "system_evaluation_campaigns_class_idx"
  ON "system_evaluation_campaigns" USING btree ("class_id");
CREATE INDEX IF NOT EXISTS "system_evaluation_campaigns_created_by_idx"
  ON "system_evaluation_campaigns" USING btree ("created_by");
CREATE UNIQUE INDEX IF NOT EXISTS "system_evaluation_assignments_campaign_respondent_unique"
  ON "system_evaluation_assignments" USING btree ("campaign_id", "respondent_id");
CREATE INDEX IF NOT EXISTS "system_evaluation_assignments_respondent_idx"
  ON "system_evaluation_assignments" USING btree ("respondent_id", "status");
CREATE INDEX IF NOT EXISTS "system_evaluation_assignments_campaign_idx"
  ON "system_evaluation_assignments" USING btree ("campaign_id");
