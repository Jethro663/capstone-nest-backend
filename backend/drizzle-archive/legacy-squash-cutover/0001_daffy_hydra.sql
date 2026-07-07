CREATE TYPE "public"."assessment_type" AS ENUM('quiz', 'exam', 'assignment');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('video', 'document', 'quiz', 'link');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('enrolled', 'dropped', 'completed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'teacher', 'admin');--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"class_id" uuid NOT NULL,
	"type" "assessment_type" DEFAULT 'quiz' NOT NULL,
	"due_date" timestamp,
	"total_points" integer DEFAULT 100 NOT NULL,
	"passing_score" integer DEFAULT 60,
	"is_published" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"schedule" text,
	"room" text,
	"school_year" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "classes_subject_id_section_id_school_year_unique" UNIQUE("subject_id","section_id","school_year")
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'enrolled' NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_student_id_class_id_unique" UNIQUE("student_id","class_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"class_id" uuid NOT NULL,
	"content_type" "content_type" DEFAULT 'video' NOT NULL,
	"content_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"grade_level" text NOT NULL,
	"school_year" text NOT NULL,
	"capacity" integer DEFAULT 40 NOT NULL,
	"room_number" text,
	"adviser_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sections_name_grade_level_school_year_unique" UNIQUE("name","grade_level","school_year")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"grade_level" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_name_unique" UNIQUE("name"),
	CONSTRAINT "subjects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "roles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_roles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "roles" CASCADE;--> statement-breakpoint
DROP TABLE "user_roles" CASCADE;--> statement-breakpoint
DROP INDEX "users_email_idx";--> statement-breakpoint
DROP INDEX "users_status_idx";--> statement-breakpoint
DROP INDEX "users_is_email_verified_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "middle_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'student' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "student_id" text;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_adviser_id_users_id_fk" FOREIGN KEY ("adviser_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "classes_teacher_idx" ON "classes" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "classes_section_idx" ON "classes" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "classes_subject_idx" ON "classes" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "classes_school_year_idx" ON "classes" USING btree ("school_year");--> statement-breakpoint
CREATE INDEX "enrollments_student_idx" ON "enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrollments_class_idx" ON "enrollments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "enrollments_section_idx" ON "enrollments" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "enrollments_status_idx" ON "enrollments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sections_adviser_idx" ON "sections" USING btree ("adviser_id");--> statement-breakpoint
CREATE INDEX "sections_grade_level_idx" ON "sections" USING btree ("grade_level");--> statement-breakpoint
CREATE INDEX "sections_school_year_idx" ON "sections" USING btree ("school_year");--> statement-breakpoint
CREATE INDEX "subjects_grade_level_idx" ON "subjects" USING btree ("grade_level");--> statement-breakpoint
CREATE INDEX "subjects_is_active_idx" ON "subjects" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "full_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "last_login_at";