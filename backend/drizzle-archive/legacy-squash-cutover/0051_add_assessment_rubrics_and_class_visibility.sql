CREATE TYPE "rubric_parse_status" AS ENUM ('pending', 'parsed', 'reviewed', 'failed');

ALTER TABLE "assessments"
ADD COLUMN "rubric_source_file_id" uuid,
ADD COLUMN "rubric_parse_status" "rubric_parse_status" DEFAULT 'pending' NOT NULL,
ADD COLUMN "rubric_parsed_at" timestamp,
ADD COLUMN "rubric_raw_text" text,
ADD COLUMN "rubric_parse_error" text,
ADD COLUMN "rubric_criteria" json;

ALTER TABLE "assessment_attempts"
ADD COLUMN "rubric_scores" json,
ADD COLUMN "direct_score" integer;

CREATE TABLE "class_visibility_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "class_id" uuid NOT NULL REFERENCES "classes"("id") ON DELETE cascade,
  "is_hidden" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "class_visibility_preferences_user_class_unique" UNIQUE("user_id","class_id")
);

CREATE INDEX "class_visibility_preferences_user_idx" ON "class_visibility_preferences" USING btree ("user_id");
CREATE INDEX "class_visibility_preferences_class_idx" ON "class_visibility_preferences" USING btree ("class_id");
