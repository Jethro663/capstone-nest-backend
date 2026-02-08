CREATE TYPE "public"."grade_level" AS ENUM('7', '8', '9', '10');--> statement-breakpoint
ALTER TABLE "user_profiles" RENAME TO "student_profiles";--> statement-breakpoint
ALTER TABLE "student_profiles" DROP CONSTRAINT "user_profiles_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "user_profiles_user_id_idx";--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "grade_level" "grade_level";--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "student_profiles_user_id_idx" ON "student_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "student_profiles_grade_level_idx" ON "student_profiles" USING btree ("grade_level");