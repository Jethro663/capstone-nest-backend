CREATE TYPE "public"."ai_session_type" AS ENUM('module_extraction', 'mentor_chat', 'mistake_explanation');--> statement-breakpoint
CREATE TYPE "public"."extraction_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('announcement_posted', 'grade_updated', 'assessment_due', 'assessment_graded');--> statement-breakpoint
CREATE TYPE "public"."gradebook_remarks" AS ENUM('Passed', 'For Intervention');--> statement-breakpoint
CREATE TYPE "public"."gradebook_status" AS ENUM('draft', 'finalized', 'locked');--> statement-breakpoint
CREATE TYPE "public"."grading_period" AS ENUM('Q1', 'Q2', 'Q3', 'Q4');--> statement-breakpoint
CREATE TABLE "ai_interaction_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_type" "ai_session_type" NOT NULL,
	"input_text" text NOT NULL,
	"output_text" text NOT NULL,
	"model_used" text NOT NULL,
	"context_metadata" json,
	"response_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracted_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"raw_text" text NOT NULL,
	"structured_content" json,
	"extraction_status" "extraction_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"model_used" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"scheduled_at" timestamp,
	"published_at" timestamp,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"reference_id" uuid,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_roster" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"last_name" text NOT NULL,
	"first_name" text NOT NULL,
	"middle_initial" text,
	"lrn" varchar(12) NOT NULL,
	"roster_email" text NOT NULL,
	"resolved_at" timestamp,
	"resolved_user_id" uuid,
	"imported_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"stored_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"file_path" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "gradebook_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gradebook_id" uuid NOT NULL,
	"name" text NOT NULL,
	"weight_percentage" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gradebook_categories_name_unique" UNIQUE("gradebook_id","name")
);
--> statement-breakpoint
CREATE TABLE "gradebook_final_grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gradebook_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"final_percentage" numeric(6, 3) NOT NULL,
	"remarks" "gradebook_remarks" NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gradebook_final_grades_gradebook_student_unique" UNIQUE("gradebook_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "gradebook_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gradebook_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"assessment_id" uuid,
	"title" text NOT NULL,
	"max_score" numeric(8, 2) NOT NULL,
	"date_given" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gradebook_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gradebook_item_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"score" numeric(8, 2) NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gradebook_scores_item_student_unique" UNIQUE("gradebook_item_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "gradebooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"grading_period" "grading_period" NOT NULL,
	"status" "gradebook_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gradebooks_class_period_unique" UNIQUE("class_id","grading_period")
);
--> statement-breakpoint
DROP INDEX "roles_name_idx";--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "lrn" varchar(12);--> statement-breakpoint
ALTER TABLE "otp_verifications" ADD COLUMN "code_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "otp_verifications" ADD COLUMN "used_at" timestamp;--> statement-breakpoint
ALTER TABLE "ai_interaction_logs" ADD CONSTRAINT "ai_interaction_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_modules" ADD CONSTRAINT "extracted_modules_file_id_uploaded_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_modules" ADD CONSTRAINT "extracted_modules_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_modules" ADD CONSTRAINT "extracted_modules_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_roster" ADD CONSTRAINT "pending_roster_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_roster" ADD CONSTRAINT "pending_roster_resolved_user_id_users_id_fk" FOREIGN KEY ("resolved_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_categories" ADD CONSTRAINT "gradebook_categories_gradebook_id_gradebooks_id_fk" FOREIGN KEY ("gradebook_id") REFERENCES "public"."gradebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_final_grades" ADD CONSTRAINT "gradebook_final_grades_gradebook_id_gradebooks_id_fk" FOREIGN KEY ("gradebook_id") REFERENCES "public"."gradebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_final_grades" ADD CONSTRAINT "gradebook_final_grades_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_items" ADD CONSTRAINT "gradebook_items_gradebook_id_gradebooks_id_fk" FOREIGN KEY ("gradebook_id") REFERENCES "public"."gradebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_items" ADD CONSTRAINT "gradebook_items_category_id_gradebook_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."gradebook_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_items" ADD CONSTRAINT "gradebook_items_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_scores" ADD CONSTRAINT "gradebook_scores_gradebook_item_id_gradebook_items_id_fk" FOREIGN KEY ("gradebook_item_id") REFERENCES "public"."gradebook_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_scores" ADD CONSTRAINT "gradebook_scores_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebooks" ADD CONSTRAINT "gradebooks_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebooks" ADD CONSTRAINT "gradebooks_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_interaction_logs_user_id_idx" ON "ai_interaction_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_interaction_logs_session_type_idx" ON "ai_interaction_logs" USING btree ("session_type");--> statement-breakpoint
CREATE INDEX "ai_interaction_logs_created_at_idx" ON "ai_interaction_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "extracted_modules_file_id_idx" ON "extracted_modules" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "extracted_modules_class_id_idx" ON "extracted_modules" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "extracted_modules_teacher_id_idx" ON "extracted_modules" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "extracted_modules_status_idx" ON "extracted_modules" USING btree ("extraction_status");--> statement-breakpoint
CREATE INDEX "announcements_class_id_idx" ON "announcements" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "announcements_author_id_idx" ON "announcements" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "announcements_class_published_idx" ON "announcements" USING btree ("class_id","published_at");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "pending_roster_section_id_idx" ON "pending_roster" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "pending_roster_roster_email_idx" ON "pending_roster" USING btree ("roster_email");--> statement-breakpoint
CREATE INDEX "uploaded_files_teacher_idx" ON "uploaded_files" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "uploaded_files_class_idx" ON "uploaded_files" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "uploaded_files_uploaded_at_idx" ON "uploaded_files" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "gradebook_categories_gradebook_idx" ON "gradebook_categories" USING btree ("gradebook_id");--> statement-breakpoint
CREATE INDEX "gradebook_final_grades_gradebook_idx" ON "gradebook_final_grades" USING btree ("gradebook_id");--> statement-breakpoint
CREATE INDEX "gradebook_final_grades_student_idx" ON "gradebook_final_grades" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "gradebook_final_grades_remarks_idx" ON "gradebook_final_grades" USING btree ("remarks");--> statement-breakpoint
CREATE INDEX "gradebook_items_gradebook_idx" ON "gradebook_items" USING btree ("gradebook_id");--> statement-breakpoint
CREATE INDEX "gradebook_items_category_idx" ON "gradebook_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "gradebook_items_assessment_idx" ON "gradebook_items" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "gradebook_scores_student_idx" ON "gradebook_scores" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "gradebook_scores_item_idx" ON "gradebook_scores" USING btree ("gradebook_item_id");--> statement-breakpoint
CREATE INDEX "gradebooks_teacher_idx" ON "gradebooks" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "gradebooks_class_idx" ON "gradebooks" USING btree ("class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "otp_active_unique_idx" ON "otp_verifications" USING btree ("user_id","purpose") WHERE is_used = false;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "student_id";--> statement-breakpoint
ALTER TABLE "otp_verifications" DROP COLUMN "code";--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_lrn_unique" UNIQUE("lrn");