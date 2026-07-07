ALTER TABLE "class_template_modules"
  ADD COLUMN IF NOT EXISTS "is_locked" boolean NOT NULL DEFAULT true;
