ALTER TABLE "class_template_modules"
ADD COLUMN IF NOT EXISTS "is_visible" boolean NOT NULL DEFAULT false;

ALTER TABLE "class_template_modules"
ADD COLUMN IF NOT EXISTS "is_locked" boolean NOT NULL DEFAULT true;

ALTER TABLE "class_template_modules"
ADD COLUMN IF NOT EXISTS "teacher_notes" text;
