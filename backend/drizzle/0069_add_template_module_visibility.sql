ALTER TABLE "class_template_modules"
  ADD COLUMN IF NOT EXISTS "is_visible" boolean NOT NULL DEFAULT false;
