ALTER TABLE "notifications" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "notifications_user_visibility_created_idx" ON "notifications" USING btree ("user_id","hidden_at","created_at");--> statement-breakpoint
UPDATE "notifications" AS notification
SET "hidden_at" = NOW()
WHERE notification."hidden_at" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "user_roles"
    JOIN "roles" ON "roles"."id" = "user_roles"."role_id"
    WHERE "user_roles"."user_id" = notification."user_id"
      AND "roles"."name" = 'teacher'
  )
  AND (
    (
      notification."type" = 'academic_lifecycle_changed'
      AND notification."metadata"->>'action' IN ('ARCHIVE_CLASS', 'ARCHIVE_SECTION')
    )
    OR EXISTS (
      SELECT 1
      FROM "classes"
      WHERE "classes"."id"::text = notification."metadata"->>'classId'
        AND "classes"."is_active" = false
    )
  );
