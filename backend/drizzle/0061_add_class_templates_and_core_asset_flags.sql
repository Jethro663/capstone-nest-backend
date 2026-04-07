DO $$
BEGIN
  CREATE TYPE "class_template_status" AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "class_template_item_type" AS ENUM ('assessment', 'lesson', 'file');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "class_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(180) NOT NULL,
  "subject_code" varchar(64) NOT NULL,
  "subject_grade_level" varchar(10) NOT NULL,
  "status" "class_template_status" NOT NULL DEFAULT 'draft',
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "published_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "class_template_modules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_id" uuid NOT NULL REFERENCES "class_templates"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "order" integer NOT NULL DEFAULT 0,
  "theme_kind" text NOT NULL DEFAULT 'gradient',
  "gradient_id" text NOT NULL DEFAULT 'oceanic-blue',
  "cover_image_url" text,
  "image_position_x" integer NOT NULL DEFAULT 50,
  "image_position_y" integer NOT NULL DEFAULT 50,
  "image_scale" integer NOT NULL DEFAULT 120,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "class_template_module_sections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_module_id" uuid NOT NULL REFERENCES "class_template_modules"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "class_template_assessments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_id" uuid NOT NULL REFERENCES "class_templates"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "type" text NOT NULL DEFAULT 'quiz',
  "due_date_offset_days" integer,
  "settings" json,
  "questions" json,
  "total_points" integer NOT NULL DEFAULT 0,
  "order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "class_template_module_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_section_id" uuid NOT NULL REFERENCES "class_template_module_sections"("id") ON DELETE CASCADE,
  "item_type" "class_template_item_type" NOT NULL DEFAULT 'assessment',
  "template_assessment_id" uuid REFERENCES "class_template_assessments"("id") ON DELETE SET NULL,
  "order" integer NOT NULL DEFAULT 0,
  "is_required" boolean NOT NULL DEFAULT false,
  "metadata" json,
  "points" integer,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "class_template_announcements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_id" uuid NOT NULL REFERENCES "class_templates"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "content" text NOT NULL,
  "is_pinned" boolean NOT NULL DEFAULT false,
  "order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "class_modules"
  ADD COLUMN IF NOT EXISTS "is_core_template_asset" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "template_id" uuid,
  ADD COLUMN IF NOT EXISTS "template_source_id" uuid;

ALTER TABLE "module_items"
  ADD COLUMN IF NOT EXISTS "is_core_template_asset" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "template_id" uuid,
  ADD COLUMN IF NOT EXISTS "template_source_id" uuid;

ALTER TABLE "assessments"
  ADD COLUMN IF NOT EXISTS "is_core_template_asset" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "template_id" uuid,
  ADD COLUMN IF NOT EXISTS "template_source_id" uuid;

ALTER TABLE "announcements"
  ADD COLUMN IF NOT EXISTS "is_visible" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "is_core_template_asset" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "template_id" uuid,
  ADD COLUMN IF NOT EXISTS "template_source_id" uuid;

CREATE INDEX IF NOT EXISTS "class_templates_subject_idx"
  ON "class_templates" ("subject_code", "subject_grade_level");
CREATE INDEX IF NOT EXISTS "class_templates_created_by_idx"
  ON "class_templates" ("created_by");
CREATE UNIQUE INDEX IF NOT EXISTS "class_templates_unique_name_by_subject"
  ON "class_templates" ("name", "subject_code", "subject_grade_level");

CREATE INDEX IF NOT EXISTS "class_template_modules_template_order_idx"
  ON "class_template_modules" ("template_id", "order");
CREATE INDEX IF NOT EXISTS "class_template_module_sections_order_idx"
  ON "class_template_module_sections" ("template_module_id", "order");
CREATE INDEX IF NOT EXISTS "class_template_assessments_template_order_idx"
  ON "class_template_assessments" ("template_id", "order");
CREATE INDEX IF NOT EXISTS "class_template_module_items_order_idx"
  ON "class_template_module_items" ("template_section_id", "order");
CREATE INDEX IF NOT EXISTS "class_template_announcements_template_order_idx"
  ON "class_template_announcements" ("template_id", "order");
