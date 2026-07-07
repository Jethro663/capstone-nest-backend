ALTER TABLE "class_modules"
ADD COLUMN "theme_kind" text NOT NULL DEFAULT 'gradient',
ADD COLUMN "gradient_id" text NOT NULL DEFAULT 'oceanic-blue',
ADD COLUMN "cover_image_url" text,
ADD COLUMN "image_position_x" integer NOT NULL DEFAULT 50,
ADD COLUMN "image_position_y" integer NOT NULL DEFAULT 50,
ADD COLUMN "image_scale" integer NOT NULL DEFAULT 120;
