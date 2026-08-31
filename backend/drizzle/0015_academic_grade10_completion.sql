CREATE TABLE "academic_student_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outcome_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"evidence" jsonb NOT NULL,
	"recorded_by" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_student_completions_outcome_id_unique" UNIQUE("outcome_id")
);
--> statement-breakpoint
ALTER TABLE "academic_student_completions" ADD CONSTRAINT "academic_student_completions_outcome_id_academic_student_year_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."academic_student_year_outcomes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_student_completions" ADD CONSTRAINT "academic_student_completions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_student_completions" ADD CONSTRAINT "academic_student_completions_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "academic_completion_student_idx" ON "academic_student_completions" USING btree ("student_id");