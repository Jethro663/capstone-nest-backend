CREATE TABLE "academic_annual_source_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_year" text NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_code" text NOT NULL,
	"grade_level" text NOT NULL,
	"period" "grading_period" NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"selected_by" uuid NOT NULL,
	"selected_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_annual_selection_unique" UNIQUE("school_year","student_id","subject_code","grade_level","period")
);
--> statement-breakpoint
CREATE TABLE "academic_back_subject_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"back_subject_id" uuid NOT NULL,
	"action" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_back_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"annual_grade_id" uuid NOT NULL,
	"remediation_result_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_code" text NOT NULL,
	"source_school_year" text NOT NULL,
	"grade_level" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_school_year" text,
	"scheduled_period" "grading_period",
	"cleared_grade" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_back_subject_annual_unique" UNIQUE("annual_grade_id"),
	CONSTRAINT "academic_back_subject_status_valid" CHECK ("academic_back_subjects"."status" IN ('pending','scheduled','cleared')),
	CONSTRAINT "academic_back_subject_schedule_valid" CHECK ("academic_back_subjects"."status" <> 'scheduled' OR ("academic_back_subjects"."scheduled_school_year" IS NOT NULL AND "academic_back_subjects"."scheduled_period" IS NOT NULL)),
	CONSTRAINT "academic_back_subject_clearance_valid" CHECK ("academic_back_subjects"."status" <> 'cleared' OR "academic_back_subjects"."cleared_grade" BETWEEN 75 AND 100)
);
--> statement-breakpoint
CREATE TABLE "academic_external_period_grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_year" text NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_code" text NOT NULL,
	"grade_level" text NOT NULL,
	"period" "grading_period" NOT NULL,
	"grade" integer NOT NULL,
	"source_reference" text NOT NULL,
	"reason" text NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"superseded_at" timestamp with time zone,
	"recorded_by" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_external_grade_range" CHECK ("academic_external_period_grades"."grade" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "academic_period_grade_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_record_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"school_year" text NOT NULL,
	"subject_code" text NOT NULL,
	"grade_level" text NOT NULL,
	"period" "grading_period" NOT NULL,
	"revision" integer NOT NULL,
	"grade" integer NOT NULL,
	"evidence" jsonb NOT NULL,
	"trusted" boolean DEFAULT true NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"invalidated_at" timestamp with time zone,
	"computed_by" uuid,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_period_revision_unique" UNIQUE("class_record_id","student_id","revision"),
	CONSTRAINT "academic_period_grade_range" CHECK ("academic_period_grade_revisions"."grade" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "academic_remediation_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"annual_grade_id" uuid NOT NULL,
	"remedial_class_mark" integer NOT NULL,
	"raw_recomputed_grade" numeric(9, 6) NOT NULL,
	"recomputed_grade" integer NOT NULL,
	"source_reference" text NOT NULL,
	"reason" text NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"recorded_by" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_remediation_grade_range" CHECK ("academic_remediation_results"."remedial_class_mark" BETWEEN 0 AND 100 AND "academic_remediation_results"."recomputed_grade" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "academic_reminder_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fingerprint" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"result" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_reminder_run_unique" UNIQUE("fingerprint","window_start")
);
--> statement-breakpoint
CREATE TABLE "academic_student_year_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_year" text NOT NULL,
	"student_id" uuid NOT NULL,
	"source_grade_level" text NOT NULL,
	"target_grade_level" text,
	"outcome" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"recorded_by" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_student_year_outcome_unique" UNIQUE("school_year","student_id")
);
--> statement-breakpoint
CREATE TABLE "academic_year_policies" (
	"school_year" text PRIMARY KEY NOT NULL,
	"policy_id" text NOT NULL,
	"policy" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_record_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_record_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"eligibility" text DEFAULT 'eligible' NOT NULL,
	"reason" text,
	"source" text NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_record_participant_unique" UNIQUE("class_record_id","student_id"),
	CONSTRAINT "class_record_participant_eligibility" CHECK ("class_record_participants"."eligibility" IN ('eligible','not_enrolled','transferred','withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "subject_annual_grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_year" text NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_code" text NOT NULL,
	"grade_level" text NOT NULL,
	"components" jsonb NOT NULL,
	"policy" jsonb NOT NULL,
	"source_fingerprint" text NOT NULL,
	"sum" integer NOT NULL,
	"divisor" integer NOT NULL,
	"raw_average" numeric(12, 6) NOT NULL,
	"official_grade" integer NOT NULL,
	"remarks" text NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"invalidated_at" timestamp with time zone,
	"invalidation_reason" text,
	"computed_by" uuid,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subject_annual_grade_range" CHECK ("subject_annual_grades"."official_grade" BETWEEN 0 AND 100 AND "subject_annual_grades"."divisor" IN (3,4))
);
--> statement-breakpoint
ALTER TABLE "class_record_scores" ALTER COLUMN "score" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "academic_system_states" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "academic_weight_profile" text;--> statement-breakpoint
ALTER TABLE "class_record_final_grades" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "class_record_items" ADD COLUMN "exam_component" text;--> statement-breakpoint
ALTER TABLE "class_record_scores" ADD COLUMN "status" text DEFAULT 'recorded' NOT NULL;--> statement-breakpoint
ALTER TABLE "class_record_scores" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "class_record_scores" ADD COLUMN "source_attempt_id" uuid;--> statement-breakpoint
ALTER TABLE "class_records" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "class_records" ADD COLUMN "roster_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "class_records" ADD COLUMN "roster_confirmed_by" uuid;--> statement-breakpoint
ALTER TABLE "academic_annual_source_selections" ADD CONSTRAINT "academic_annual_source_selections_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_annual_source_selections" ADD CONSTRAINT "academic_annual_source_selections_selected_by_users_id_fk" FOREIGN KEY ("selected_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_back_subject_events" ADD CONSTRAINT "academic_back_subject_events_back_subject_id_academic_back_subjects_id_fk" FOREIGN KEY ("back_subject_id") REFERENCES "public"."academic_back_subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_back_subject_events" ADD CONSTRAINT "academic_back_subject_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_back_subjects" ADD CONSTRAINT "academic_back_subjects_annual_grade_id_subject_annual_grades_id_fk" FOREIGN KEY ("annual_grade_id") REFERENCES "public"."subject_annual_grades"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_back_subjects" ADD CONSTRAINT "academic_back_subjects_remediation_result_id_academic_remediation_results_id_fk" FOREIGN KEY ("remediation_result_id") REFERENCES "public"."academic_remediation_results"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_back_subjects" ADD CONSTRAINT "academic_back_subjects_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_external_period_grades" ADD CONSTRAINT "academic_external_period_grades_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_external_period_grades" ADD CONSTRAINT "academic_external_period_grades_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_period_grade_revisions" ADD CONSTRAINT "academic_period_grade_revisions_class_record_id_class_records_id_fk" FOREIGN KEY ("class_record_id") REFERENCES "public"."class_records"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_period_grade_revisions" ADD CONSTRAINT "academic_period_grade_revisions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_period_grade_revisions" ADD CONSTRAINT "academic_period_grade_revisions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_period_grade_revisions" ADD CONSTRAINT "academic_period_grade_revisions_computed_by_users_id_fk" FOREIGN KEY ("computed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_remediation_results" ADD CONSTRAINT "academic_remediation_results_annual_grade_id_subject_annual_grades_id_fk" FOREIGN KEY ("annual_grade_id") REFERENCES "public"."subject_annual_grades"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_remediation_results" ADD CONSTRAINT "academic_remediation_results_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_reminder_runs" ADD CONSTRAINT "academic_reminder_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_student_year_outcomes" ADD CONSTRAINT "academic_student_year_outcomes_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_student_year_outcomes" ADD CONSTRAINT "academic_student_year_outcomes_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_record_participants" ADD CONSTRAINT "class_record_participants_class_record_id_class_records_id_fk" FOREIGN KEY ("class_record_id") REFERENCES "public"."class_records"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_record_participants" ADD CONSTRAINT "class_record_participants_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_record_participants" ADD CONSTRAINT "class_record_participants_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_annual_grades" ADD CONSTRAINT "subject_annual_grades_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_annual_grades" ADD CONSTRAINT "subject_annual_grades_computed_by_users_id_fk" FOREIGN KEY ("computed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "academic_back_subject_event_idx" ON "academic_back_subject_events" USING btree ("back_subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_back_subject_schedule_unique" ON "academic_back_subjects" USING btree ("student_id","scheduled_school_year","scheduled_period") WHERE "academic_back_subjects"."status" = 'scheduled';--> statement-breakpoint
CREATE INDEX "academic_back_subject_student_status_idx" ON "academic_back_subjects" USING btree ("student_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_external_current_unique" ON "academic_external_period_grades" USING btree ("school_year","student_id","subject_code","grade_level","period") WHERE "academic_external_period_grades"."is_current" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_period_current_unique" ON "academic_period_grade_revisions" USING btree ("class_record_id","student_id") WHERE "academic_period_grade_revisions"."is_current" = true;--> statement-breakpoint
CREATE INDEX "academic_period_subject_lookup" ON "academic_period_grade_revisions" USING btree ("school_year","student_id","subject_code","grade_level");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_remediation_current_unique" ON "academic_remediation_results" USING btree ("annual_grade_id") WHERE "academic_remediation_results"."is_current" = true;--> statement-breakpoint
CREATE INDEX "class_record_participant_student_idx" ON "class_record_participants" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subject_annual_current_unique" ON "subject_annual_grades" USING btree ("school_year","student_id","subject_code","grade_level") WHERE "subject_annual_grades"."is_current" = true;--> statement-breakpoint
CREATE INDEX "subject_annual_source_idx" ON "subject_annual_grades" USING btree ("source_fingerprint");--> statement-breakpoint
CREATE INDEX "subject_annual_student_year_idx" ON "subject_annual_grades" USING btree ("school_year","student_id");--> statement-breakpoint
ALTER TABLE "class_records" ADD CONSTRAINT "class_records_roster_confirmed_by_users_id_fk" FOREIGN KEY ("roster_confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_record_scores" ADD CONSTRAINT "class_record_score_status_valid" CHECK (("class_record_scores"."status" = 'recorded' AND "class_record_scores"."score" IS NOT NULL AND "class_record_scores"."score" >= 0) OR ("class_record_scores"."status" = 'excused' AND "class_record_scores"."score" IS NULL AND length(trim("class_record_scores"."reason")) > 0 AND "class_record_scores"."reason" IS NOT NULL));