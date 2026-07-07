ALTER TABLE "classes"
ADD COLUMN IF NOT EXISTS "card_preset" text NOT NULL DEFAULT 'aurora';

ALTER TABLE "classes"
ADD COLUMN IF NOT EXISTS "card_banner_url" text;
