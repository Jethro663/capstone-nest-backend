CREATE TYPE "public"."ai_session_type" AS ENUM('module_extraction', 'mentor_chat', 'admin_analytics_chat', 'mistake_explanation');--> statement-breakpoint
CREATE TYPE "public"."extraction_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'applied');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('announcement_posted', 'discussion_thread_posted', 'discussion_comment_posted', 'assessment_assigned', 'grade_updated', 'assessment_due', 'assessment_graded');--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('ACTIVE', 'PENDING', 'SUSPENDED', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."assessment_type" AS ENUM('quiz', 'exam', 'assignment', 'file_upload');--> statement-breakpoint
CREATE TYPE "public"."class_record_category" AS ENUM('written_work', 'performance_task', 'quarterly_assessment');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('video', 'document', 'quiz', 'link');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('enrolled', 'dropped', 'completed');--> statement-breakpoint
CREATE TYPE "public"."feedback_level" AS ENUM('immediate', 'standard', 'detailed');--> statement-breakpoint
CREATE TYPE "public"."file_scope" AS ENUM('private', 'general');--> statement-breakpoint
CREATE TYPE "public"."grade_level" AS ENUM('7', '8', '9', '10');--> statement-breakpoint
CREATE TYPE "public"."grading_period" AS ENUM('Q1', 'Q2', 'Q3', 'Q4');--> statement-breakpoint
CREATE TYPE "public"."lesson_content_type" AS ENUM('text', 'image', 'video', 'question', 'file', 'divider');--> statement-breakpoint
CREATE TYPE "public"."lesson_version_type" AS ENUM('auto', 'manual', 'restore');--> statement-breakpoint
CREATE TYPE "public"."library_file_kind" AS ENUM('pdf', 'txt', 'pptx', 'image');--> statement-breakpoint
CREATE TYPE "public"."library_index_status" AS ENUM('not_indexed', 'pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."library_subject_key" AS ENUM('math', 'science', 'english', 'filipino', 'ap', 'tle', 'mapeh', 'esp');--> statement-breakpoint
CREATE TYPE "public"."module_item_type" AS ENUM('lesson', 'assessment', 'file');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('multiple_choice', 'multiple_select', 'true_false', 'short_answer', 'fill_blank', 'dropdown');--> statement-breakpoint
CREATE TYPE "public"."rubric_parse_status" AS ENUM('pending', 'parsed', 'reviewed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."student_course_view_mode" AS ENUM('card', 'wide');--> statement-breakpoint
CREATE TYPE "public"."student_presentation_mode" AS ENUM('solid', 'gradient', 'preset');--> statement-breakpoint
CREATE TYPE "public"."class_record_remarks" AS ENUM('Passed', 'For Intervention');--> statement-breakpoint
CREATE TYPE "public"."class_record_status" AS ENUM('draft', 'finalized', 'locked');--> statement-breakpoint
CREATE TYPE "public"."class_template_item_type" AS ENUM('assessment', 'lesson', 'file');--> statement-breakpoint
CREATE TYPE "public"."class_template_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."discussion_attachment_type" AS ENUM('image', 'pdf', 'link');--> statement-breakpoint
CREATE TYPE "public"."discussion_reaction_type" AS ENUM('like', 'heart', 'wow');--> statement-breakpoint
CREATE TYPE "public"."discussion_thread_status" AS ENUM('draft', 'published', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."otp_purpose" AS ENUM('email_verification', 'password_reset', 'login_2fa');--> statement-breakpoint
CREATE TYPE "public"."ai_policy_source_scope" AS ENUM('recommended_only', 'class_materials');--> statement-breakpoint
CREATE TYPE "public"."intervention_case_status" AS ENUM('pending', 'active', 'completed', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."lxp_assignment_type" AS ENUM('lesson_review', 'assessment_retry', 'generated_lesson_review', 'guided_assessment');--> statement-breakpoint
CREATE TYPE "public"."lxp_generated_artifact_status" AS ENUM('draft', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."lxp_guided_attempt_status" AS ENUM('in_progress', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."system_evaluation_assignment_status" AS ENUM('pending', 'submitted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."system_evaluation_audience_role" AS ENUM('student', 'teacher');--> statement-breakpoint
CREATE TYPE "public"."system_evaluation_campaign_status" AS ENUM('draft', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."system_evaluation_form_type" AS ENUM('system', 'ja_hub');--> statement-breakpoint
CREATE TYPE "public"."system_evaluation_target" AS ENUM('lms', 'lxp', 'ai_mentor', 'intervention', 'overall');--> statement-breakpoint
CREATE TYPE "public"."teacher_evaluation_type" AS ENUM('teacher_class', 'ja_hub', 'learners_path');--> statement-breakpoint
CREATE TYPE "public"."teacher_evaluation_window_status" AS ENUM('active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."ai_generation_job_type" AS ENUM('quiz_generation', 'remedial_plan_generation', 'performance_diagnostics', 'class_lesson_plan_generation', 'reindexing', 'backfill');--> statement-breakpoint
CREATE TYPE "public"."ai_generation_output_type" AS ENUM('assessment_draft', 'intervention_recommendation', 'performance_diagnostic', 'class_lesson_plan');--> statement-breakpoint
CREATE TYPE "public"."ai_generation_status" AS ENUM('pending', 'processing', 'completed', 'approved', 'cancelled', 'rejected', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_source_type" AS ENUM('lesson_block', 'extracted_module', 'assessment_question', 'library_file');--> statement-breakpoint
CREATE TYPE "public"."school_event_type" AS ENUM('school_event', 'holiday_break');--> statement-breakpoint
CREATE TYPE "public"."ja_guardrail_event_type" AS ENUM('blocked_prompt');--> statement-breakpoint
CREATE TYPE "public"."ja_reward_state" AS ENUM('pending', 'awarded');--> statement-breakpoint
CREATE TYPE "public"."ja_session_event_type" AS ENUM('focus_lost', 'focus_restored', 'focus_strike', 'resumed', 'completed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."ja_session_mode" AS ENUM('practice', 'review');--> statement-breakpoint
CREATE TYPE "public"."ja_session_status" AS ENUM('active', 'completed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."ja_thread_message_role" AS ENUM('student', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."ja_thread_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."ja_xp_event_type" AS ENUM('session_completion');--> statement-breakpoint
CREATE TABLE "academic_system_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_year" text NOT NULL,
	"quarter" "grading_period" DEFAULT 'Q1' NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_interaction_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_type" "ai_session_type" NOT NULL,
	"input_text" text NOT NULL,
	"output_text" text NOT NULL,
	"model_used" text NOT NULL,
	"context_metadata" json,
	"response_time_ms" integer,
	"session_id" uuid,
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
	"is_applied" boolean DEFAULT false NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"total_chunks" integer,
	"processed_chunks" integer DEFAULT 0 NOT NULL,
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
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_core_template_asset" boolean DEFAULT false NOT NULL,
	"template_id" uuid,
	"template_source_id" uuid,
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
CREATE TABLE "archived_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"archived_data" json NOT NULL,
	"archived_by" uuid NOT NULL,
	"archived_at" timestamp DEFAULT now() NOT NULL,
	"purged_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "assessment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"last_question_index" integer DEFAULT 0 NOT NULL,
	"current_question_started_at" timestamp,
	"current_question_deadline_at" timestamp,
	"violation_count" integer DEFAULT 0 NOT NULL,
	"question_order" text[],
	"draft_responses" json,
	"submitted_at" timestamp,
	"score" integer,
	"passed" boolean,
	"is_submitted" boolean DEFAULT false,
	"time_spent_seconds" integer DEFAULT 0,
	"is_returned" boolean DEFAULT false,
	"returned_at" timestamp,
	"teacher_feedback" text,
	"rubric_scores" json,
	"direct_score" integer,
	"submitted_files" json,
	"submitted_file_id" uuid,
	"submitted_file_original_name" text,
	"submitted_file_mime_type" varchar(100),
	"submitted_file_size_bytes" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_attempts_student_assessment_attempt_unique" UNIQUE("student_id","assessment_id","attempt_number")
);
--> statement-breakpoint
CREATE TABLE "assessment_question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"text" text NOT NULL,
	"image_url" text,
	"is_correct" boolean DEFAULT false,
	"order" integer DEFAULT 0 NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"type" "question_type" DEFAULT 'multiple_choice' NOT NULL,
	"content" text NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT true,
	"explanation" text,
	"image_url" text,
	"metadata" json,
	"concept_tags" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"student_answer" text,
	"selected_option_id" uuid,
	"selected_option_ids" text[],
	"is_correct" boolean,
	"points_earned" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"class_id" uuid NOT NULL,
	"type" "assessment_type" DEFAULT 'quiz' NOT NULL,
	"due_date" timestamp,
	"close_when_due" boolean DEFAULT true NOT NULL,
	"randomize_questions" boolean DEFAULT false NOT NULL,
	"timed_questions_enabled" boolean DEFAULT false NOT NULL,
	"question_time_limit_seconds" integer,
	"strict_mode" boolean DEFAULT false NOT NULL,
	"file_upload_instructions" text,
	"teacher_attachment_file_id" uuid,
	"rubric_source_file_id" uuid,
	"rubric_parse_status" "rubric_parse_status" DEFAULT 'pending' NOT NULL,
	"rubric_parsed_at" timestamp,
	"rubric_raw_text" text,
	"rubric_parse_error" text,
	"rubric_criteria" json,
	"allowed_upload_mime_types" text[],
	"allowed_upload_extensions" text[],
	"max_upload_size_bytes" integer DEFAULT 104857600,
	"total_points" integer DEFAULT 0 NOT NULL,
	"passing_score" integer DEFAULT 60,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"time_limit_minutes" integer,
	"is_published" boolean DEFAULT false,
	"feedback_level" "feedback_level" DEFAULT 'standard',
	"feedback_delay_hours" integer DEFAULT 24,
	"is_core_template_asset" boolean DEFAULT false NOT NULL,
	"template_id" uuid,
	"template_source_id" uuid,
	"class_record_category" "class_record_category",
	"quarter" "grading_period",
	"ai_origin" text,
	"ai_generation_output_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"teacher_notes" text,
	"theme_kind" text DEFAULT 'gradient' NOT NULL,
	"gradient_id" text DEFAULT 'oceanic-blue' NOT NULL,
	"cover_image_url" text,
	"image_position_x" integer DEFAULT 50 NOT NULL,
	"image_position_y" integer DEFAULT 50 NOT NULL,
	"image_scale" integer DEFAULT 120 NOT NULL,
	"is_core_template_asset" boolean DEFAULT false NOT NULL,
	"template_id" uuid,
	"template_source_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "class_modules_class_title_unique" UNIQUE("class_id","title")
);
--> statement-breakpoint
CREATE TABLE "class_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"days" text[] NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_visibility_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"is_hidden" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "class_visibility_preferences_user_class_unique" UNIQUE("user_id","class_id")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_name" text NOT NULL,
	"subject_code" text NOT NULL,
	"subject_grade_level" "grade_level",
	"section_id" uuid NOT NULL,
	"teacher_id" uuid,
	"room" text,
	"card_preset" text DEFAULT 'aurora' NOT NULL,
	"card_banner_url" text,
	"school_year" text NOT NULL,
	"written_work_grading_weight" integer DEFAULT 30 NOT NULL,
	"performance_task_grading_weight" integer DEFAULT 50 NOT NULL,
	"quarterly_assessment_grading_weight" integer DEFAULT 20 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "classes_subject_code_section_id_school_year_unique" UNIQUE("subject_code","section_id","school_year")
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid,
	"section_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'enrolled' NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_student_id_class_id_unique" UNIQUE("student_id","class_id")
);
--> statement-breakpoint
CREATE TABLE "lesson_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"progress_percentage" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "lesson_completions_student_lesson_unique" UNIQUE("student_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "lesson_content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"type" "lesson_content_type" NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"content" json NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_versions" (
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
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"class_id" uuid NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"is_draft" boolean DEFAULT true NOT NULL,
	"source_extraction_id" uuid,
	"is_core_template_asset" boolean DEFAULT false NOT NULL,
	"template_id" uuid,
	"template_source_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"owner_id" uuid NOT NULL,
	"parent_id" uuid,
	"scope" "file_scope" DEFAULT 'private' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "module_grading_scale_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"letter" varchar(8) NOT NULL,
	"label" text NOT NULL,
	"min_score" integer NOT NULL,
	"max_score" integer NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_section_id" uuid NOT NULL,
	"item_type" "module_item_type" NOT NULL,
	"lesson_id" uuid,
	"assessment_id" uuid,
	"file_id" uuid,
	"order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_given" boolean DEFAULT true NOT NULL,
	"is_core_template_asset" boolean DEFAULT false NOT NULL,
	"template_id" uuid,
	"template_source_id" uuid,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "module_items_lesson_id_unique" UNIQUE("lesson_id"),
	CONSTRAINT "module_items_assessment_id_unique" UNIQUE("assessment_id")
);
--> statement-breakpoint
CREATE TABLE "module_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "section_visibility_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"is_hidden" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "section_visibility_preferences_user_section_unique" UNIQUE("user_id","section_id")
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"grade_level" text NOT NULL,
	"school_year" text NOT NULL,
	"capacity" integer DEFAULT 40 NOT NULL,
	"room_number" text,
	"card_banner_url" text,
	"adviser_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sections_name_grade_level_school_year_unique" UNIQUE("name","grade_level","school_year")
);
--> statement-breakpoint
CREATE TABLE "student_class_presentation_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"style_mode" "student_presentation_mode" DEFAULT 'gradient' NOT NULL,
	"style_token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_class_presentation_preferences_user_class_unique" UNIQUE("user_id","class_id")
);
--> statement-breakpoint
CREATE TABLE "student_course_view_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"view_mode" "student_course_view_mode" DEFAULT 'card' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_course_view_preferences_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"date_of_birth" timestamp,
	"profile_picture" text,
	"gender" text,
	"phone" text,
	"address" text,
	"family_name" text,
	"family_relationship" text,
	"family_contact" text,
	"grade_level" "grade_level",
	"lrn" varchar(12),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_profiles_lrn_unique" UNIQUE("lrn")
);
--> statement-breakpoint
CREATE TABLE "teacher_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"department" text,
	"specialization" text,
	"profile_picture" text,
	"contact_number" text,
	"date_of_birth" timestamp,
	"gender" text,
	"address" text,
	"employee_id" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_id" uuid,
	"teacher_id" uuid NOT NULL,
	"class_id" uuid,
	"scope" "file_scope" DEFAULT 'private' NOT NULL,
	"ai_enabled" boolean DEFAULT true NOT NULL,
	"subject_key" "library_subject_key",
	"grade_level" "grade_level",
	"teacher_visible" boolean DEFAULT true NOT NULL,
	"index_status" "library_index_status" DEFAULT 'not_indexed' NOT NULL,
	"index_error" text,
	"indexed_at" timestamp,
	"content_hash" text,
	"file_kind" "library_file_kind" DEFAULT 'pdf' NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"stored_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"file_path" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" text NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"account_status" "account_status" DEFAULT 'ACTIVE' NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "class_record_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gradebook_id" uuid NOT NULL,
	"name" text NOT NULL,
	"weight_percentage" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "class_record_categories_name_unique" UNIQUE("gradebook_id","name")
);
--> statement-breakpoint
CREATE TABLE "class_record_final_grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gradebook_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"final_percentage" numeric(6, 3) NOT NULL,
	"remarks" "class_record_remarks" NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "class_record_final_grades_record_student_unique" UNIQUE("gradebook_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "class_record_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gradebook_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"assessment_id" uuid,
	"title" text NOT NULL,
	"max_score" numeric(8, 2) NOT NULL,
	"item_order" integer DEFAULT 0 NOT NULL,
	"date_given" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_record_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gradebook_item_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"score" numeric(8, 2) NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "class_record_scores_item_student_unique" UNIQUE("gradebook_item_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "class_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid,
	"grading_period" "grading_period" NOT NULL,
	"status" "class_record_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "class_records_class_period_unique" UNIQUE("class_id","grading_period")
);
--> statement-breakpoint
CREATE TABLE "class_template_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_template_assessment_question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_assessment_question_id" uuid NOT NULL,
	"text" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_template_assessment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_assessment_id" uuid NOT NULL,
	"type" text DEFAULT 'multiple_choice' NOT NULL,
	"content" text NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"explanation" text,
	"image_url" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_template_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'quiz' NOT NULL,
	"due_date_offset_days" integer,
	"settings" json,
	"total_points" integer DEFAULT 0 NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_template_engine_chunks" (
	"id" varchar(190) PRIMARY KEY NOT NULL,
	"template_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"chunk_order" integer DEFAULT 0 NOT NULL,
	"content" text NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_template_lesson_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_lesson_id" uuid NOT NULL,
	"block_type" text NOT NULL,
	"block_version" integer DEFAULT 1 NOT NULL,
	"payload" json NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_template_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_template_module_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_section_id" uuid NOT NULL,
	"item_type" "class_template_item_type" DEFAULT 'assessment' NOT NULL,
	"template_assessment_id" uuid,
	"template_lesson_id" uuid,
	"order" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"metadata" json,
	"points" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_template_module_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_template_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"theme_kind" text DEFAULT 'gradient' NOT NULL,
	"gradient_id" text DEFAULT 'oceanic-blue' NOT NULL,
	"cover_image_url" text,
	"image_position_x" integer DEFAULT 50 NOT NULL,
	"image_position_y" integer DEFAULT 50 NOT NULL,
	"image_scale" integer DEFAULT 120 NOT NULL,
	"is_visible" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT true NOT NULL,
	"teacher_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(180) NOT NULL,
	"subject_code" varchar(64) NOT NULL,
	"subject_grade_level" varchar(10) NOT NULL,
	"status" "class_template_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "class_templates_unique_name_by_subject" UNIQUE("name","subject_code","subject_grade_level")
);
--> statement-breakpoint
CREATE TABLE "discussion_comment_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_comment_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reaction_type" "discussion_reaction_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body_html" text,
	"deleted_at" timestamp,
	"deleted_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_thread_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"attachment_type" "discussion_attachment_type" NOT NULL,
	"file_id" uuid,
	"link_url" text,
	"link_label" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"body_html" text NOT NULL,
	"theme_id" varchar(64) DEFAULT 'classic' NOT NULL,
	"comment_limit_per_student" integer,
	"allow_comments" boolean DEFAULT true NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"status" "discussion_thread_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"closed_at" timestamp,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"purpose" "otp_purpose" DEFAULT 'email_verification' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"user_agent" text,
	"ip" text,
	"revoked" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "performance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"previous_is_at_risk" boolean,
	"current_is_at_risk" boolean NOT NULL,
	"assessment_average" numeric(6, 3),
	"class_record_average" numeric(6, 3),
	"blended_score" numeric(6, 3),
	"threshold_applied" numeric(6, 3) NOT NULL,
	"trigger_source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"assessment_average" numeric(6, 3),
	"class_record_average" numeric(6, 3),
	"blended_score" numeric(6, 3),
	"assessment_sample_size" integer DEFAULT 0 NOT NULL,
	"class_record_sample_size" integer DEFAULT 0 NOT NULL,
	"has_data" boolean DEFAULT false NOT NULL,
	"is_at_risk" boolean DEFAULT false NOT NULL,
	"threshold_applied" numeric(6, 3) DEFAULT '74' NOT NULL,
	"last_computed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "performance_snapshots_class_student_unique" UNIQUE("class_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "class_ai_policies" (
	"class_id" uuid NOT NULL,
	"mentor_explain_enabled" boolean DEFAULT true NOT NULL,
	"max_follow_up_turns" integer DEFAULT 3 NOT NULL,
	"source_scope" "ai_policy_source_scope" DEFAULT 'class_materials' NOT NULL,
	"strict_grounding" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "class_ai_policies_class_id_pk" PRIMARY KEY("class_id")
);
--> statement-breakpoint
CREATE TABLE "lxp_generated_guided_assessment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guided_assessment_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"status" "lxp_guided_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"current_question_index" integer DEFAULT 0 NOT NULL,
	"responses" json DEFAULT '[]'::json NOT NULL,
	"hint_usage" json DEFAULT '[]'::json NOT NULL,
	"score" integer,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"formative_summary" json,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"last_activity_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lxp_generated_guided_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"approval_status" "lxp_generated_artifact_status" DEFAULT 'draft' NOT NULL,
	"source_assessment_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"weak_concepts" json NOT NULL,
	"source_references" json NOT NULL,
	"questions" json NOT NULL,
	"formative_summary" text,
	"approved_by" uuid,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lxp_generated_remedial_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"approval_status" "lxp_generated_artifact_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"lesson_body" text NOT NULL,
	"weak_concepts" json NOT NULL,
	"source_lesson_ids" json NOT NULL,
	"source_references" json NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intervention_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"assignment_type" "lxp_assignment_type" NOT NULL,
	"lesson_id" uuid,
	"assessment_id" uuid,
	"generated_remedial_lesson_id" uuid,
	"generated_guided_assessment_id" uuid,
	"checkpoint_label" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"xp_awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intervention_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "intervention_case_status" DEFAULT 'pending' NOT NULL,
	"trigger_source" text DEFAULT 'performance_event' NOT NULL,
	"trigger_score" numeric(6, 3),
	"threshold_applied" numeric(6, 3) NOT NULL,
	"note" text,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lxp_progress" (
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"xp_total" integer DEFAULT 0 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"checkpoints_completed" integer DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lxp_progress_student_id_class_id_pk" PRIMARY KEY("student_id","class_id")
);
--> statement-breakpoint
CREATE TABLE "system_evaluation_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"respondent_id" uuid NOT NULL,
	"respondent_role" "system_evaluation_audience_role" NOT NULL,
	"status" "system_evaluation_assignment_status" DEFAULT 'pending' NOT NULL,
	"submitted_evaluation_id" uuid,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_evaluation_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"form_type" "system_evaluation_form_type" NOT NULL,
	"target_module" "system_evaluation_target" NOT NULL,
	"audience_role" "system_evaluation_audience_role" NOT NULL,
	"class_id" uuid,
	"title" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"status" "system_evaluation_campaign_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"submitted_by" uuid NOT NULL,
	"target_module" "system_evaluation_target" NOT NULL,
	"usability_score" integer NOT NULL,
	"functionality_score" integer NOT NULL,
	"performance_score" integer NOT NULL,
	"satisfaction_score" integer NOT NULL,
	"overall_score" integer,
	"question_ratings_json" json,
	"feedback" text,
	"ai_context_metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_evaluation_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"school_year" text NOT NULL,
	"grading_period" "grading_period" NOT NULL,
	"evaluation_type" "teacher_evaluation_type" NOT NULL,
	"ratings_json" json NOT NULL,
	"comment" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_evaluation_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"school_year" text NOT NULL,
	"grading_period" "grading_period" NOT NULL,
	"evaluation_type" "teacher_evaluation_type" NOT NULL,
	"status" "teacher_evaluation_window_status" DEFAULT 'active' NOT NULL,
	"eligible_count" integer DEFAULT 0 NOT NULL,
	"opens_at" timestamp DEFAULT now() NOT NULL,
	"closes_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" "ai_generation_job_type" NOT NULL,
	"class_id" uuid,
	"teacher_id" uuid,
	"status" "ai_generation_status" DEFAULT 'pending' NOT NULL,
	"source_filters" json,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_generation_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"output_type" "ai_generation_output_type" NOT NULL,
	"target_class_id" uuid,
	"target_teacher_id" uuid,
	"source_filters" json,
	"structured_output" json NOT NULL,
	"status" "ai_generation_status" DEFAULT 'completed' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_chunk_embeddings" (
	"chunk_id" uuid PRIMARY KEY NOT NULL,
	"embedding" vector(768) NOT NULL,
	"embedding_model" text NOT NULL,
	"embedded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" "content_source_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"class_id" uuid,
	"library_file_id" uuid,
	"subject_key" "library_subject_key",
	"grade_level" "grade_level",
	"lesson_id" uuid,
	"assessment_id" uuid,
	"question_id" uuid,
	"extraction_id" uuid,
	"chunk_text" text NOT NULL,
	"chunk_order" integer DEFAULT 0 NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"content_hash" text NOT NULL,
	"metadata_json" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_concept_mastery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"concept_key" text NOT NULL,
	"evidence_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"mastery_score" integer DEFAULT 0 NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "school_event_type" DEFAULT 'school_event' NOT NULL,
	"school_year" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"all_day" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ja_guardrail_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"thread_id" uuid,
	"message_id" uuid,
	"event_type" "ja_guardrail_event_type" NOT NULL,
	"payload_json" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ja_progress" (
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"xp_total" integer DEFAULT 0 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"sessions_completed" integer DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ja_progress_student_id_class_id_pk" PRIMARY KEY("student_id","class_id")
);
--> statement-breakpoint
CREATE TABLE "ja_session_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"event_type" "ja_session_event_type" NOT NULL,
	"payload_json" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ja_session_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"item_type" text NOT NULL,
	"prompt" text NOT NULL,
	"options_json" json,
	"answer_key_json" json NOT NULL,
	"hint" text,
	"explanation" text,
	"citations_json" json,
	"validation_json" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ja_session_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_item_id" uuid NOT NULL,
	"student_answer_json" json NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"score_delta" integer DEFAULT 0 NOT NULL,
	"feedback" text,
	"answered_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ja_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"mode" "ja_session_mode" DEFAULT 'practice' NOT NULL,
	"status" "ja_session_status" DEFAULT 'active' NOT NULL,
	"question_count" integer DEFAULT 10 NOT NULL,
	"current_index" integer DEFAULT 0 NOT NULL,
	"strike_count" integer DEFAULT 0 NOT NULL,
	"reward_state" "ja_reward_state" DEFAULT 'pending' NOT NULL,
	"source_snapshot_json" json,
	"grounding_status" text DEFAULT 'grounded' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ja_thread_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"role" "ja_thread_message_role" NOT NULL,
	"content" text NOT NULL,
	"citations_json" json,
	"quick_action" text,
	"blocked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ja_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"title" text DEFAULT 'JA Ask Thread' NOT NULL,
	"status" "ja_thread_status" DEFAULT 'active' NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ja_xp_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"session_id" uuid,
	"event_type" "ja_xp_event_type" DEFAULT 'session_completion' NOT NULL,
	"xp_delta" integer NOT NULL,
	"metadata_json" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academic_system_states" ADD CONSTRAINT "academic_system_states_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_interaction_logs" ADD CONSTRAINT "ai_interaction_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_modules" ADD CONSTRAINT "extracted_modules_file_id_uploaded_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_modules" ADD CONSTRAINT "extracted_modules_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_modules" ADD CONSTRAINT "extracted_modules_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_question_options" ADD CONSTRAINT "assessment_question_options_question_id_assessment_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_attempt_id_assessment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."assessment_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_question_id_assessment_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_selected_option_id_assessment_question_options_id_fk" FOREIGN KEY ("selected_option_id") REFERENCES "public"."assessment_question_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_modules" ADD CONSTRAINT "class_modules_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_visibility_preferences" ADD CONSTRAINT "class_visibility_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_visibility_preferences" ADD CONSTRAINT "class_visibility_preferences_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_content_blocks" ADD CONSTRAINT "lesson_content_blocks_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_versions" ADD CONSTRAINT "lesson_versions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_versions" ADD CONSTRAINT "lesson_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_folders" ADD CONSTRAINT "library_folders_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_grading_scale_entries" ADD CONSTRAINT "module_grading_scale_entries_module_id_class_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."class_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_items" ADD CONSTRAINT "module_items_module_section_id_module_sections_id_fk" FOREIGN KEY ("module_section_id") REFERENCES "public"."module_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_items" ADD CONSTRAINT "module_items_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_items" ADD CONSTRAINT "module_items_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_sections" ADD CONSTRAINT "module_sections_module_id_class_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."class_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_roster" ADD CONSTRAINT "pending_roster_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_roster" ADD CONSTRAINT "pending_roster_resolved_user_id_users_id_fk" FOREIGN KEY ("resolved_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_visibility_preferences" ADD CONSTRAINT "section_visibility_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_visibility_preferences" ADD CONSTRAINT "section_visibility_preferences_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_adviser_id_users_id_fk" FOREIGN KEY ("adviser_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_class_presentation_preferences" ADD CONSTRAINT "student_class_presentation_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_class_presentation_preferences" ADD CONSTRAINT "student_class_presentation_preferences_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_course_view_preferences" ADD CONSTRAINT "student_course_view_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_profiles" ADD CONSTRAINT "teacher_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_record_categories" ADD CONSTRAINT "class_record_categories_gradebook_id_class_records_id_fk" FOREIGN KEY ("gradebook_id") REFERENCES "public"."class_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_record_final_grades" ADD CONSTRAINT "class_record_final_grades_gradebook_id_class_records_id_fk" FOREIGN KEY ("gradebook_id") REFERENCES "public"."class_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_record_final_grades" ADD CONSTRAINT "class_record_final_grades_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_record_items" ADD CONSTRAINT "class_record_items_gradebook_id_class_records_id_fk" FOREIGN KEY ("gradebook_id") REFERENCES "public"."class_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_record_items" ADD CONSTRAINT "class_record_items_category_id_class_record_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."class_record_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_record_items" ADD CONSTRAINT "class_record_items_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_record_scores" ADD CONSTRAINT "class_record_scores_gradebook_item_id_class_record_items_id_fk" FOREIGN KEY ("gradebook_item_id") REFERENCES "public"."class_record_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_record_scores" ADD CONSTRAINT "class_record_scores_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_records" ADD CONSTRAINT "class_records_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_records" ADD CONSTRAINT "class_records_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_template_announcements" ADD CONSTRAINT "class_template_announcements_template_id_class_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."class_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_template_assessment_question_options" ADD CONSTRAINT "class_template_assessment_question_options_template_assessment_question_id_class_template_assessment_questions_id_fk" FOREIGN KEY ("template_assessment_question_id") REFERENCES "public"."class_template_assessment_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_template_assessment_questions" ADD CONSTRAINT "class_template_assessment_questions_template_assessment_id_class_template_assessments_id_fk" FOREIGN KEY ("template_assessment_id") REFERENCES "public"."class_template_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_template_assessments" ADD CONSTRAINT "class_template_assessments_template_id_class_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."class_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_template_engine_chunks" ADD CONSTRAINT "class_template_engine_chunks_template_id_class_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."class_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_template_lesson_blocks" ADD CONSTRAINT "class_template_lesson_blocks_template_lesson_id_class_template_lessons_id_fk" FOREIGN KEY ("template_lesson_id") REFERENCES "public"."class_template_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_template_lessons" ADD CONSTRAINT "class_template_lessons_template_id_class_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."class_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_template_module_items" ADD CONSTRAINT "class_template_module_items_template_section_id_class_template_module_sections_id_fk" FOREIGN KEY ("template_section_id") REFERENCES "public"."class_template_module_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_template_module_items" ADD CONSTRAINT "class_template_module_items_template_assessment_id_class_template_assessments_id_fk" FOREIGN KEY ("template_assessment_id") REFERENCES "public"."class_template_assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_template_module_items" ADD CONSTRAINT "class_template_module_items_template_lesson_id_class_template_lessons_id_fk" FOREIGN KEY ("template_lesson_id") REFERENCES "public"."class_template_lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_template_module_sections" ADD CONSTRAINT "class_template_module_sections_template_module_id_class_template_modules_id_fk" FOREIGN KEY ("template_module_id") REFERENCES "public"."class_template_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_template_modules" ADD CONSTRAINT "class_template_modules_template_id_class_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."class_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_templates" ADD CONSTRAINT "class_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comment_attachments" ADD CONSTRAINT "discussion_comment_attachments_comment_id_discussion_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."discussion_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comment_attachments" ADD CONSTRAINT "discussion_comment_attachments_file_id_uploaded_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comment_reactions" ADD CONSTRAINT "discussion_comment_reactions_comment_id_discussion_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."discussion_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comment_reactions" ADD CONSTRAINT "discussion_comment_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_thread_attachments" ADD CONSTRAINT "discussion_thread_attachments_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_thread_attachments" ADD CONSTRAINT "discussion_thread_attachments_file_id_uploaded_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_logs" ADD CONSTRAINT "performance_logs_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_logs" ADD CONSTRAINT "performance_logs_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_snapshots" ADD CONSTRAINT "performance_snapshots_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_snapshots" ADD CONSTRAINT "performance_snapshots_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_ai_policies" ADD CONSTRAINT "class_ai_policies_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_ai_policies" ADD CONSTRAINT "class_ai_policies_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_generated_guided_assessment_attempts" ADD CONSTRAINT "lxp_generated_guided_assessment_attempts_guided_assessment_id_lxp_generated_guided_assessments_id_fk" FOREIGN KEY ("guided_assessment_id") REFERENCES "public"."lxp_generated_guided_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_generated_guided_assessment_attempts" ADD CONSTRAINT "lxp_generated_guided_assessment_attempts_case_id_intervention_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."intervention_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_generated_guided_assessment_attempts" ADD CONSTRAINT "lxp_generated_guided_assessment_attempts_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_generated_guided_assessment_attempts" ADD CONSTRAINT "lxp_generated_guided_assessment_attempts_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_generated_guided_assessment_attempts" ADD CONSTRAINT "lxp_generated_guided_assessment_attempts_assignment_id_intervention_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."intervention_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_generated_guided_assessments" ADD CONSTRAINT "lxp_generated_guided_assessments_case_id_intervention_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."intervention_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_generated_guided_assessments" ADD CONSTRAINT "lxp_generated_guided_assessments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_generated_guided_assessments" ADD CONSTRAINT "lxp_generated_guided_assessments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_generated_guided_assessments" ADD CONSTRAINT "lxp_generated_guided_assessments_source_assessment_id_assessments_id_fk" FOREIGN KEY ("source_assessment_id") REFERENCES "public"."assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_generated_guided_assessments" ADD CONSTRAINT "lxp_generated_guided_assessments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_generated_remedial_lessons" ADD CONSTRAINT "lxp_generated_remedial_lessons_case_id_intervention_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."intervention_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_generated_remedial_lessons" ADD CONSTRAINT "lxp_generated_remedial_lessons_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_generated_remedial_lessons" ADD CONSTRAINT "lxp_generated_remedial_lessons_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_generated_remedial_lessons" ADD CONSTRAINT "lxp_generated_remedial_lessons_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_assignments" ADD CONSTRAINT "intervention_assignments_case_id_intervention_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."intervention_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_assignments" ADD CONSTRAINT "intervention_assignments_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_assignments" ADD CONSTRAINT "intervention_assignments_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_cases" ADD CONSTRAINT "intervention_cases_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_cases" ADD CONSTRAINT "intervention_cases_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_progress" ADD CONSTRAINT "lxp_progress_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lxp_progress" ADD CONSTRAINT "lxp_progress_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_evaluation_assignments" ADD CONSTRAINT "system_evaluation_assignments_campaign_id_system_evaluation_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."system_evaluation_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_evaluation_assignments" ADD CONSTRAINT "system_evaluation_assignments_respondent_id_users_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_evaluation_assignments" ADD CONSTRAINT "system_evaluation_assignments_submitted_evaluation_id_system_evaluations_id_fk" FOREIGN KEY ("submitted_evaluation_id") REFERENCES "public"."system_evaluations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_evaluation_campaigns" ADD CONSTRAINT "system_evaluation_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_evaluation_campaigns" ADD CONSTRAINT "system_evaluation_campaigns_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_evaluations" ADD CONSTRAINT "system_evaluations_campaign_id_system_evaluation_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."system_evaluation_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_evaluations" ADD CONSTRAINT "system_evaluations_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_evaluation_submissions" ADD CONSTRAINT "teacher_evaluation_submissions_window_id_teacher_evaluation_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."teacher_evaluation_windows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_evaluation_submissions" ADD CONSTRAINT "teacher_evaluation_submissions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_evaluation_submissions" ADD CONSTRAINT "teacher_evaluation_submissions_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_evaluation_submissions" ADD CONSTRAINT "teacher_evaluation_submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_evaluation_windows" ADD CONSTRAINT "teacher_evaluation_windows_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_evaluation_windows" ADD CONSTRAINT "teacher_evaluation_windows_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generation_jobs" ADD CONSTRAINT "ai_generation_jobs_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generation_jobs" ADD CONSTRAINT "ai_generation_jobs_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generation_outputs" ADD CONSTRAINT "ai_generation_outputs_job_id_ai_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ai_generation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generation_outputs" ADD CONSTRAINT "ai_generation_outputs_target_class_id_classes_id_fk" FOREIGN KEY ("target_class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generation_outputs" ADD CONSTRAINT "ai_generation_outputs_target_teacher_id_users_id_fk" FOREIGN KEY ("target_teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generation_outputs" ADD CONSTRAINT "ai_generation_outputs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_chunk_embeddings" ADD CONSTRAINT "content_chunk_embeddings_chunk_id_content_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."content_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_chunks" ADD CONSTRAINT "content_chunks_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_chunks" ADD CONSTRAINT "content_chunks_library_file_id_uploaded_files_id_fk" FOREIGN KEY ("library_file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_chunks" ADD CONSTRAINT "content_chunks_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_chunks" ADD CONSTRAINT "content_chunks_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_chunks" ADD CONSTRAINT "content_chunks_question_id_assessment_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_chunks" ADD CONSTRAINT "content_chunks_extraction_id_extracted_modules_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."extracted_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_concept_mastery" ADD CONSTRAINT "student_concept_mastery_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_concept_mastery" ADD CONSTRAINT "student_concept_mastery_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_guardrail_events" ADD CONSTRAINT "ja_guardrail_events_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_guardrail_events" ADD CONSTRAINT "ja_guardrail_events_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_guardrail_events" ADD CONSTRAINT "ja_guardrail_events_thread_id_ja_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."ja_threads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_guardrail_events" ADD CONSTRAINT "ja_guardrail_events_message_id_ja_thread_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ja_thread_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_progress" ADD CONSTRAINT "ja_progress_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_progress" ADD CONSTRAINT "ja_progress_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_session_events" ADD CONSTRAINT "ja_session_events_session_id_ja_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ja_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_session_items" ADD CONSTRAINT "ja_session_items_session_id_ja_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ja_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_session_responses" ADD CONSTRAINT "ja_session_responses_session_item_id_ja_session_items_id_fk" FOREIGN KEY ("session_item_id") REFERENCES "public"."ja_session_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_sessions" ADD CONSTRAINT "ja_sessions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_sessions" ADD CONSTRAINT "ja_sessions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_thread_messages" ADD CONSTRAINT "ja_thread_messages_thread_id_ja_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."ja_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_threads" ADD CONSTRAINT "ja_threads_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_threads" ADD CONSTRAINT "ja_threads_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_xp_ledger" ADD CONSTRAINT "ja_xp_ledger_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_xp_ledger" ADD CONSTRAINT "ja_xp_ledger_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ja_xp_ledger" ADD CONSTRAINT "ja_xp_ledger_session_id_ja_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ja_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "academic_system_states_school_year_idx" ON "academic_system_states" USING btree ("school_year");--> statement-breakpoint
CREATE INDEX "academic_system_states_quarter_idx" ON "academic_system_states" USING btree ("quarter");--> statement-breakpoint
CREATE INDEX "academic_system_states_updated_at_idx" ON "academic_system_states" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "ai_interaction_logs_user_id_idx" ON "ai_interaction_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_interaction_logs_session_type_idx" ON "ai_interaction_logs" USING btree ("session_type");--> statement-breakpoint
CREATE INDEX "ai_interaction_logs_created_at_idx" ON "ai_interaction_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_interaction_logs_session_id_idx" ON "ai_interaction_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "extracted_modules_file_id_idx" ON "extracted_modules" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "extracted_modules_class_id_idx" ON "extracted_modules" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "extracted_modules_teacher_id_idx" ON "extracted_modules" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "extracted_modules_status_idx" ON "extracted_modules" USING btree ("extraction_status");--> statement-breakpoint
CREATE INDEX "announcements_class_id_idx" ON "announcements" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "announcements_author_id_idx" ON "announcements" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "announcements_class_published_idx" ON "announcements" USING btree ("class_id","published_at");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_user_type_reference_unique_idx" ON "notifications" USING btree ("user_id","type","reference_id") WHERE reference_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "archived_users_original_user_id_idx" ON "archived_users" USING btree ("original_user_id");--> statement-breakpoint
CREATE INDEX "archived_users_email_idx" ON "archived_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "archived_users_archived_at_idx" ON "archived_users" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "assessment_attempts_student_id_idx" ON "assessment_attempts" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "assessment_attempts_assessment_id_idx" ON "assessment_attempts" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "assessment_attempts_expires_at_idx" ON "assessment_attempts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "assessment_attempts_submitted_idx" ON "assessment_attempts" USING btree ("is_submitted");--> statement-breakpoint
CREATE INDEX "assessment_question_options_question_id_idx" ON "assessment_question_options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "assessment_questions_assessment_id_idx" ON "assessment_questions" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "assessment_questions_order_idx" ON "assessment_questions" USING btree ("order");--> statement-breakpoint
CREATE INDEX "assessment_responses_attempt_id_idx" ON "assessment_responses" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "assessment_responses_question_id_idx" ON "assessment_responses" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "assessments_class_id_idx" ON "assessments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "class_modules_class_id_idx" ON "class_modules" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "class_modules_class_order_idx" ON "class_modules" USING btree ("class_id","order");--> statement-breakpoint
CREATE INDEX "class_schedules_class_id_idx" ON "class_schedules" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "class_visibility_preferences_user_idx" ON "class_visibility_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "class_visibility_preferences_class_idx" ON "class_visibility_preferences" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "classes_teacher_idx" ON "classes" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "classes_section_idx" ON "classes" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "classes_subject_code_idx" ON "classes" USING btree ("subject_code");--> statement-breakpoint
CREATE INDEX "classes_subject_name_idx" ON "classes" USING btree ("subject_name");--> statement-breakpoint
CREATE INDEX "classes_school_year_idx" ON "classes" USING btree ("school_year");--> statement-breakpoint
CREATE INDEX "enrollments_student_idx" ON "enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrollments_class_idx" ON "enrollments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "enrollments_section_idx" ON "enrollments" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "enrollments_status_idx" ON "enrollments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lesson_completions_student_id_idx" ON "lesson_completions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "lesson_completions_lesson_id_idx" ON "lesson_completions" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_content_blocks_lesson_id_idx" ON "lesson_content_blocks" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_content_blocks_lesson_order_idx" ON "lesson_content_blocks" USING btree ("lesson_id","order");--> statement-breakpoint
CREATE INDEX "lesson_versions_lesson_id_idx" ON "lesson_versions" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "lessons_class_id_idx" ON "lessons" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "lessons_class_order_idx" ON "lessons" USING btree ("class_id","order");--> statement-breakpoint
CREATE INDEX "lessons_source_extraction_idx" ON "lessons" USING btree ("source_extraction_id");--> statement-breakpoint
CREATE INDEX "lessons_template_id_idx" ON "lessons" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "lessons_template_source_id_idx" ON "lessons" USING btree ("template_source_id");--> statement-breakpoint
CREATE INDEX "library_folders_owner_idx" ON "library_folders" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "library_folders_parent_idx" ON "library_folders" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "library_folders_scope_idx" ON "library_folders" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "module_grading_scale_entries_module_id_idx" ON "module_grading_scale_entries" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "module_grading_scale_entries_module_order_idx" ON "module_grading_scale_entries" USING btree ("module_id","order");--> statement-breakpoint
CREATE INDEX "module_items_section_id_idx" ON "module_items" USING btree ("module_section_id");--> statement-breakpoint
CREATE INDEX "module_items_section_order_idx" ON "module_items" USING btree ("module_section_id","order");--> statement-breakpoint
CREATE INDEX "module_items_lesson_id_idx" ON "module_items" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "module_items_assessment_id_idx" ON "module_items" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "module_items_file_id_idx" ON "module_items" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "module_sections_module_id_idx" ON "module_sections" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "module_sections_module_order_idx" ON "module_sections" USING btree ("module_id","order");--> statement-breakpoint
CREATE INDEX "pending_roster_section_id_idx" ON "pending_roster" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "pending_roster_roster_email_idx" ON "pending_roster" USING btree ("roster_email");--> statement-breakpoint
CREATE INDEX "section_visibility_preferences_user_idx" ON "section_visibility_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "section_visibility_preferences_section_idx" ON "section_visibility_preferences" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "sections_adviser_idx" ON "sections" USING btree ("adviser_id");--> statement-breakpoint
CREATE INDEX "sections_grade_level_idx" ON "sections" USING btree ("grade_level");--> statement-breakpoint
CREATE INDEX "sections_school_year_idx" ON "sections" USING btree ("school_year");--> statement-breakpoint
CREATE INDEX "student_class_presentation_preferences_user_idx" ON "student_class_presentation_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "student_class_presentation_preferences_class_idx" ON "student_class_presentation_preferences" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "student_course_view_preferences_user_idx" ON "student_course_view_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "student_profiles_user_id_idx" ON "student_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "student_profiles_grade_level_idx" ON "student_profiles" USING btree ("grade_level");--> statement-breakpoint
CREATE INDEX "teacher_profiles_user_id_idx" ON "teacher_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "teacher_profiles_department_idx" ON "teacher_profiles" USING btree ("department");--> statement-breakpoint
CREATE INDEX "teacher_profiles_employee_id_idx" ON "teacher_profiles" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "uploaded_files_folder_idx" ON "uploaded_files" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "uploaded_files_teacher_idx" ON "uploaded_files" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "uploaded_files_class_idx" ON "uploaded_files" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "uploaded_files_scope_idx" ON "uploaded_files" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "uploaded_files_teacher_ai_enabled_lookup_idx" ON "uploaded_files" USING btree ("teacher_id","ai_enabled","scope","subject_key","grade_level","deleted_at");--> statement-breakpoint
CREATE INDEX "uploaded_files_general_partition_idx" ON "uploaded_files" USING btree ("scope","subject_key","grade_level","teacher_visible","deleted_at");--> statement-breakpoint
CREATE INDEX "uploaded_files_index_status_idx" ON "uploaded_files" USING btree ("index_status");--> statement-breakpoint
CREATE INDEX "uploaded_files_uploaded_at_idx" ON "uploaded_files" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "user_roles_user_id_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_roles_role_id_idx" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("account_status");--> statement-breakpoint
CREATE INDEX "class_record_categories_class_record_idx" ON "class_record_categories" USING btree ("gradebook_id");--> statement-breakpoint
CREATE INDEX "class_record_final_grades_record_idx" ON "class_record_final_grades" USING btree ("gradebook_id");--> statement-breakpoint
CREATE INDEX "class_record_final_grades_student_idx" ON "class_record_final_grades" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "class_record_final_grades_remarks_idx" ON "class_record_final_grades" USING btree ("remarks");--> statement-breakpoint
CREATE INDEX "class_record_items_class_record_idx" ON "class_record_items" USING btree ("gradebook_id");--> statement-breakpoint
CREATE INDEX "class_record_items_category_idx" ON "class_record_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "class_record_items_assessment_idx" ON "class_record_items" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "class_record_items_order_idx" ON "class_record_items" USING btree ("item_order");--> statement-breakpoint
CREATE INDEX "class_record_scores_student_idx" ON "class_record_scores" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "class_record_scores_item_idx" ON "class_record_scores" USING btree ("gradebook_item_id");--> statement-breakpoint
CREATE INDEX "class_records_teacher_idx" ON "class_records" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "class_records_class_idx" ON "class_records" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "class_template_announcements_template_order_idx" ON "class_template_announcements" USING btree ("template_id","order");--> statement-breakpoint
CREATE INDEX "class_template_assessment_question_options_question_order_idx" ON "class_template_assessment_question_options" USING btree ("template_assessment_question_id","order");--> statement-breakpoint
CREATE INDEX "class_template_assessment_questions_assessment_order_idx" ON "class_template_assessment_questions" USING btree ("template_assessment_id","order");--> statement-breakpoint
CREATE INDEX "class_template_assessments_template_order_idx" ON "class_template_assessments" USING btree ("template_id","order");--> statement-breakpoint
CREATE INDEX "class_template_engine_chunks_template_order_idx" ON "class_template_engine_chunks" USING btree ("template_id","chunk_order");--> statement-breakpoint
CREATE INDEX "class_template_engine_chunks_source_idx" ON "class_template_engine_chunks" USING btree ("template_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "class_template_lesson_blocks_lesson_order_idx" ON "class_template_lesson_blocks" USING btree ("template_lesson_id","order");--> statement-breakpoint
CREATE INDEX "class_template_lessons_template_order_idx" ON "class_template_lessons" USING btree ("template_id","order");--> statement-breakpoint
CREATE INDEX "class_template_module_items_order_idx" ON "class_template_module_items" USING btree ("template_section_id","order");--> statement-breakpoint
CREATE INDEX "class_template_module_sections_order_idx" ON "class_template_module_sections" USING btree ("template_module_id","order");--> statement-breakpoint
CREATE INDEX "class_template_modules_template_order_idx" ON "class_template_modules" USING btree ("template_id","order");--> statement-breakpoint
CREATE INDEX "class_templates_subject_idx" ON "class_templates" USING btree ("subject_code","subject_grade_level");--> statement-breakpoint
CREATE INDEX "class_templates_created_by_idx" ON "class_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "discussion_comment_attachments_comment_idx" ON "discussion_comment_attachments" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "discussion_comment_attachments_file_idx" ON "discussion_comment_attachments" USING btree ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "discussion_comment_attachments_comment_file_unique_idx" ON "discussion_comment_attachments" USING btree ("comment_id","file_id");--> statement-breakpoint
CREATE INDEX "discussion_comment_reactions_comment_idx" ON "discussion_comment_reactions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "discussion_comment_reactions_user_idx" ON "discussion_comment_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "discussion_comment_reactions_comment_user_unique_idx" ON "discussion_comment_reactions" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX "discussion_comments_thread_created_idx" ON "discussion_comments" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "discussion_comments_author_idx" ON "discussion_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "discussion_thread_attachments_thread_idx" ON "discussion_thread_attachments" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "discussion_thread_attachments_file_idx" ON "discussion_thread_attachments" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "discussion_threads_class_status_pub_idx" ON "discussion_threads" USING btree ("class_id","status","published_at");--> statement-breakpoint
CREATE INDEX "discussion_threads_class_created_idx" ON "discussion_threads" USING btree ("class_id","created_at");--> statement-breakpoint
CREATE INDEX "discussion_threads_author_idx" ON "discussion_threads" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "otp_verifications_user_id_idx" ON "otp_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "otp_verifications_expires_at_idx" ON "otp_verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "otp_verifications_purpose_idx" ON "otp_verifications" USING btree ("purpose");--> statement-breakpoint
CREATE INDEX "otp_verifications_is_used_idx" ON "otp_verifications" USING btree ("is_used");--> statement-breakpoint
CREATE UNIQUE INDEX "otp_active_unique_idx" ON "otp_verifications" USING btree ("user_id","purpose") WHERE is_used = false;--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_revoked_idx" ON "refresh_tokens" USING btree ("revoked");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "performance_logs_class_created_at_idx" ON "performance_logs" USING btree ("class_id","created_at");--> statement-breakpoint
CREATE INDEX "performance_logs_class_student_idx" ON "performance_logs" USING btree ("class_id","student_id");--> statement-breakpoint
CREATE INDEX "performance_logs_student_created_at_idx" ON "performance_logs" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "performance_snapshots_class_risk_idx" ON "performance_snapshots" USING btree ("class_id","is_at_risk");--> statement-breakpoint
CREATE INDEX "performance_snapshots_class_student_idx" ON "performance_snapshots" USING btree ("class_id","student_id");--> statement-breakpoint
CREATE INDEX "performance_snapshots_class_idx" ON "performance_snapshots" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "performance_snapshots_student_idx" ON "performance_snapshots" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "class_ai_policies_updated_by_idx" ON "class_ai_policies" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "lxp_generated_guided_attempts_guided_assessment_idx" ON "lxp_generated_guided_assessment_attempts" USING btree ("guided_assessment_id");--> statement-breakpoint
CREATE INDEX "lxp_generated_guided_attempts_case_student_idx" ON "lxp_generated_guided_assessment_attempts" USING btree ("case_id","student_id");--> statement-breakpoint
CREATE INDEX "lxp_generated_guided_attempts_assignment_idx" ON "lxp_generated_guided_assessment_attempts" USING btree ("assignment_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lxp_generated_guided_attempts_assignment_attempt_unique" ON "lxp_generated_guided_assessment_attempts" USING btree ("assignment_id","student_id","attempt_number");--> statement-breakpoint
CREATE INDEX "lxp_generated_guided_assessments_case_idx" ON "lxp_generated_guided_assessments" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "lxp_generated_guided_assessments_class_idx" ON "lxp_generated_guided_assessments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "lxp_generated_guided_assessments_student_idx" ON "lxp_generated_guided_assessments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "lxp_generated_guided_assessments_status_idx" ON "lxp_generated_guided_assessments" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "lxp_generated_remedial_lessons_case_idx" ON "lxp_generated_remedial_lessons" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "lxp_generated_remedial_lessons_class_idx" ON "lxp_generated_remedial_lessons" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "lxp_generated_remedial_lessons_student_idx" ON "lxp_generated_remedial_lessons" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "lxp_generated_remedial_lessons_status_idx" ON "lxp_generated_remedial_lessons" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "intervention_assignments_case_order_idx" ON "intervention_assignments" USING btree ("case_id","order_index");--> statement-breakpoint
CREATE INDEX "intervention_assignments_case_completed_idx" ON "intervention_assignments" USING btree ("case_id","is_completed");--> statement-breakpoint
CREATE INDEX "intervention_assignments_lesson_idx" ON "intervention_assignments" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "intervention_assignments_assessment_idx" ON "intervention_assignments" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "intervention_assignments_generated_lesson_idx" ON "intervention_assignments" USING btree ("generated_remedial_lesson_id");--> statement-breakpoint
CREATE INDEX "intervention_assignments_generated_assessment_idx" ON "intervention_assignments" USING btree ("generated_guided_assessment_id");--> statement-breakpoint
CREATE INDEX "intervention_cases_class_student_status_idx" ON "intervention_cases" USING btree ("class_id","student_id","status");--> statement-breakpoint
CREATE INDEX "intervention_cases_student_status_idx" ON "intervention_cases" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "intervention_cases_class_status_idx" ON "intervention_cases" USING btree ("class_id","status");--> statement-breakpoint
CREATE INDEX "lxp_progress_class_idx" ON "lxp_progress" USING btree ("class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "system_evaluation_assignments_campaign_respondent_unique" ON "system_evaluation_assignments" USING btree ("campaign_id","respondent_id");--> statement-breakpoint
CREATE INDEX "system_evaluation_assignments_respondent_idx" ON "system_evaluation_assignments" USING btree ("respondent_id","status");--> statement-breakpoint
CREATE INDEX "system_evaluation_assignments_campaign_idx" ON "system_evaluation_assignments" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "system_evaluation_campaigns_status_idx" ON "system_evaluation_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "system_evaluation_campaigns_form_audience_idx" ON "system_evaluation_campaigns" USING btree ("form_type","audience_role");--> statement-breakpoint
CREATE INDEX "system_evaluation_campaigns_class_idx" ON "system_evaluation_campaigns" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "system_evaluation_campaigns_created_by_idx" ON "system_evaluation_campaigns" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "system_evaluations_module_created_idx" ON "system_evaluations" USING btree ("target_module","created_at");--> statement-breakpoint
CREATE INDEX "system_evaluations_submitted_by_idx" ON "system_evaluations" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "system_evaluations_campaign_idx" ON "system_evaluations" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_evaluation_submissions_student_scope_unique" ON "teacher_evaluation_submissions" USING btree ("student_id","class_id","school_year","grading_period","evaluation_type");--> statement-breakpoint
CREATE INDEX "teacher_evaluation_submissions_window_idx" ON "teacher_evaluation_submissions" USING btree ("window_id");--> statement-breakpoint
CREATE INDEX "teacher_evaluation_submissions_teacher_idx" ON "teacher_evaluation_submissions" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "teacher_evaluation_submissions_class_period_idx" ON "teacher_evaluation_submissions" USING btree ("class_id","grading_period","evaluation_type");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_evaluation_windows_class_period_type_unique" ON "teacher_evaluation_windows" USING btree ("class_id","school_year","grading_period","evaluation_type");--> statement-breakpoint
CREATE INDEX "teacher_evaluation_windows_teacher_idx" ON "teacher_evaluation_windows" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "teacher_evaluation_windows_class_idx" ON "teacher_evaluation_windows" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "teacher_evaluation_windows_period_type_idx" ON "teacher_evaluation_windows" USING btree ("grading_period","evaluation_type");--> statement-breakpoint
CREATE INDEX "ai_generation_jobs_class_id_idx" ON "ai_generation_jobs" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "ai_generation_jobs_teacher_id_idx" ON "ai_generation_jobs" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "ai_generation_jobs_status_idx" ON "ai_generation_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_generation_outputs_job_id_idx" ON "ai_generation_outputs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "ai_generation_outputs_target_class_id_idx" ON "ai_generation_outputs" USING btree ("target_class_id");--> statement-breakpoint
CREATE INDEX "ai_generation_outputs_target_teacher_id_idx" ON "ai_generation_outputs" USING btree ("target_teacher_id");--> statement-breakpoint
CREATE INDEX "ai_generation_outputs_status_idx" ON "ai_generation_outputs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_chunk_embeddings_model_idx" ON "content_chunk_embeddings" USING btree ("embedding_model");--> statement-breakpoint
CREATE INDEX "content_chunks_class_id_idx" ON "content_chunks" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "content_chunks_source_type_source_id_idx" ON "content_chunks" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "content_chunks_lesson_id_idx" ON "content_chunks" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "content_chunks_assessment_id_idx" ON "content_chunks" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "content_chunks_question_id_idx" ON "content_chunks" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "content_chunks_extraction_id_idx" ON "content_chunks" USING btree ("extraction_id");--> statement-breakpoint
CREATE INDEX "content_chunks_library_file_idx" ON "content_chunks" USING btree ("source_type","library_file_id","subject_key","grade_level");--> statement-breakpoint
CREATE UNIQUE INDEX "student_concept_mastery_student_class_concept_idx" ON "student_concept_mastery" USING btree ("student_id","class_id","concept_key");--> statement-breakpoint
CREATE INDEX "student_concept_mastery_class_id_idx" ON "student_concept_mastery" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "school_events_school_year_idx" ON "school_events" USING btree ("school_year");--> statement-breakpoint
CREATE INDEX "school_events_starts_at_idx" ON "school_events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "school_events_ends_at_idx" ON "school_events" USING btree ("ends_at");--> statement-breakpoint
CREATE INDEX "school_events_archived_at_idx" ON "school_events" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "ja_guardrail_events_student_class_idx" ON "ja_guardrail_events" USING btree ("student_id","class_id");--> statement-breakpoint
CREATE INDEX "ja_guardrail_events_thread_created_at_idx" ON "ja_guardrail_events" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "ja_progress_class_idx" ON "ja_progress" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "ja_session_events_session_created_at_idx" ON "ja_session_events" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ja_session_items_session_order_unique" ON "ja_session_items" USING btree ("session_id","order_index");--> statement-breakpoint
CREATE INDEX "ja_session_items_session_idx" ON "ja_session_items" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ja_session_responses_session_item_unique" ON "ja_session_responses" USING btree ("session_item_id");--> statement-breakpoint
CREATE INDEX "ja_sessions_student_status_idx" ON "ja_sessions" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "ja_sessions_class_status_idx" ON "ja_sessions" USING btree ("class_id","status");--> statement-breakpoint
CREATE INDEX "ja_sessions_started_at_idx" ON "ja_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "ja_thread_messages_thread_created_at_idx" ON "ja_thread_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "ja_threads_student_class_idx" ON "ja_threads" USING btree ("student_id","class_id");--> statement-breakpoint
CREATE INDEX "ja_threads_class_status_idx" ON "ja_threads" USING btree ("class_id","status");--> statement-breakpoint
CREATE INDEX "ja_xp_ledger_student_class_idx" ON "ja_xp_ledger" USING btree ("student_id","class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ja_xp_ledger_session_event_unique" ON "ja_xp_ledger" USING btree ("session_id","event_type");