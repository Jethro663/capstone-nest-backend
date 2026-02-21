-- Fix column types that were renamed in earlier migrations without a TYPE conversion.

-- classes.subject_name was renamed from subject_id (uuid) — should be text
ALTER TABLE "classes" ALTER COLUMN "subject_name" TYPE text USING "subject_name"::text;
--> statement-breakpoint

-- lessons.order was renamed from content_type (enum) — should be integer
-- Must drop default first, change type, then restore default
ALTER TABLE "lessons" ALTER COLUMN "order" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "lessons" ALTER COLUMN "order" TYPE integer USING 0;
--> statement-breakpoint
ALTER TABLE "lessons" ALTER COLUMN "order" SET DEFAULT 0;
--> statement-breakpoint

-- lessons.is_draft was renamed from content_url (text) — should be boolean
ALTER TABLE "lessons" ALTER COLUMN "is_draft" TYPE boolean USING false;
--> statement-breakpoint
ALTER TABLE "lessons" ALTER COLUMN "is_draft" SET DEFAULT true;
