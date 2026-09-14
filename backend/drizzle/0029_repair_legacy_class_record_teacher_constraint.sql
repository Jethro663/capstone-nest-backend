-- Legacy gradebook deployments retained the original RESTRICT foreign key
-- after gradebooks was renamed to class_records. Rebuild the relationship
-- under its canonical name so upgraded and fresh databases both use SET NULL.
ALTER TABLE "class_records"
  DROP CONSTRAINT IF EXISTS "gradebooks_teacher_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "class_records"
  DROP CONSTRAINT IF EXISTS "class_records_teacher_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "class_records"
  ADD CONSTRAINT "class_records_teacher_id_users_id_fk"
  FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
