DO $$ BEGIN
 CREATE TYPE "public"."lesson_version_type" AS ENUM('auto', 'manual', 'restore');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "lesson_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lesson_id" uuid NOT NULL,
  "version_number" integer NOT NULL,
  "type" "lesson_version_type" DEFAULT 'auto' NOT NULL,
  "label" text,
  "snapshot" json NOT NULL,
  "created_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "lesson_versions_lesson_version_unique" UNIQUE("lesson_id","version_number")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lesson_versions" ADD CONSTRAINT "lesson_versions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lesson_versions" ADD CONSTRAINT "lesson_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_versions_lesson_id_idx" ON "lesson_versions" USING btree ("lesson_id");
