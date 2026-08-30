ALTER TABLE "student_profiles" ADD COLUMN "graduated_at" timestamp;--> statement-breakpoint
CREATE INDEX "student_profiles_graduated_at_idx" ON "student_profiles" USING btree ("graduated_at");