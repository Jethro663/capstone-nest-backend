DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'ai_policy_source_scope'
  ) THEN
    CREATE TYPE "ai_policy_source_scope" AS ENUM ('recommended_only', 'class_materials');
  END IF;
END $$;

ALTER TABLE "system_evaluations"
  ADD COLUMN IF NOT EXISTS "ai_context_metadata" json;

CREATE TABLE IF NOT EXISTS "class_ai_policies" (
  "class_id" uuid PRIMARY KEY NOT NULL,
  "mentor_explain_enabled" boolean DEFAULT true NOT NULL,
  "max_follow_up_turns" integer DEFAULT 3 NOT NULL,
  "source_scope" "ai_policy_source_scope" DEFAULT 'class_materials' NOT NULL,
  "strict_grounding" boolean DEFAULT false NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'class_ai_policies_class_id_classes_id_fk'
  ) THEN
    ALTER TABLE "class_ai_policies"
      ADD CONSTRAINT "class_ai_policies_class_id_classes_id_fk"
      FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'class_ai_policies_updated_by_users_id_fk'
  ) THEN
    ALTER TABLE "class_ai_policies"
      ADD CONSTRAINT "class_ai_policies_updated_by_users_id_fk"
      FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id")
      ON DELETE SET NULL;
  END IF;
END $$;
