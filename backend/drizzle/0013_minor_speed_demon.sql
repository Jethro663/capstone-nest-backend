CREATE TABLE "lesson_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"progress_percentage" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "lesson_completions_student_lesson_unique" UNIQUE("student_id","lesson_id")
);
--> statement-breakpoint
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lesson_completions_student_id_idx" ON "lesson_completions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "lesson_completions_lesson_id_idx" ON "lesson_completions" USING btree ("lesson_id");