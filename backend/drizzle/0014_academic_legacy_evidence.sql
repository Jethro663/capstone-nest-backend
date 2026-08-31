CREATE TABLE "academic_legacy_grade_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_final_grade_id" uuid NOT NULL,
	"class_record_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"school_year" text NOT NULL,
	"period" "grading_period" NOT NULL,
	"source_snapshot" jsonb NOT NULL,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_legacy_grade_evidence_source_final_grade_id_unique" UNIQUE("source_final_grade_id")
);
--> statement-breakpoint
ALTER TABLE "class_records" ADD COLUMN "policy_exclusion_reason" text;--> statement-breakpoint
ALTER TABLE "class_records" ADD COLUMN "policy_excluded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "class_records" ADD COLUMN "policy_excluded_by" uuid;--> statement-breakpoint
ALTER TABLE "academic_legacy_grade_evidence" ADD CONSTRAINT "academic_legacy_grade_evidence_class_record_id_class_records_id_fk" FOREIGN KEY ("class_record_id") REFERENCES "public"."class_records"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_legacy_grade_evidence" ADD CONSTRAINT "academic_legacy_grade_evidence_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "academic_legacy_record_idx" ON "academic_legacy_grade_evidence" USING btree ("class_record_id");--> statement-breakpoint
CREATE INDEX "academic_legacy_year_idx" ON "academic_legacy_grade_evidence" USING btree ("school_year");--> statement-breakpoint
ALTER TABLE "class_records" ADD CONSTRAINT "class_records_policy_excluded_by_users_id_fk" FOREIGN KEY ("policy_excluded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- Preserve raw legacy projections without rounding or certifying their eligibility.
INSERT INTO academic_legacy_grade_evidence (source_final_grade_id, class_record_id, student_id, school_year, period, source_snapshot)
SELECT f.id, f.gradebook_id, f.student_id, c.school_year, r.grading_period,
  jsonb_build_object('finalGrade', to_jsonb(f), 'record', to_jsonb(r), 'class', jsonb_build_object('id', c.id, 'subjectCode', c.subject_code, 'subjectName', c.subject_name, 'gradeLevel', c.subject_grade_level, 'sectionId', c.section_id, 'writtenWorkWeight', c.written_work_grading_weight, 'performanceTaskWeight', c.performance_task_grading_weight, 'examinationWeight', c.quarterly_assessment_grading_weight), 'trusted', false, 'policyProvenance', 'unknown_legacy')
FROM class_record_final_grades f JOIN class_records r ON r.id=f.gradebook_id JOIN classes c ON c.id=r.class_id
WHERE NOT EXISTS (SELECT 1 FROM academic_period_grade_revisions p WHERE p.class_record_id=r.id AND p.student_id=f.student_id AND p.revision=f.revision)
ON CONFLICT (source_final_grade_id) DO NOTHING;
