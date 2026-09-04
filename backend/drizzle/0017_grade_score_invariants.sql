CREATE TABLE "grade_score_repair_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"migration_key" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"original_data" json NOT NULL,
	"repaired_data" json,
	"repaired_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grade_score_repair_evidence_key_unique" UNIQUE("migration_key")
);
--> statement-breakpoint
ALTER TABLE "class_record_scores" DROP CONSTRAINT "class_record_score_status_valid";--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "base_points_earned" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "possible_points_snapshot" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "bonus_points" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "bonus_reason" text;--> statement-breakpoint
ALTER TABLE "class_record_scores" ADD COLUMN "bonus_points" numeric(8, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "class_record_scores" ADD COLUMN "bonus_reason" text;--> statement-breakpoint
CREATE INDEX "grade_score_repair_evidence_entity_idx" ON "grade_score_repair_evidence" USING btree ("entity_type","entity_id");--> statement-breakpoint
WITH ranked_responses AS (
	SELECT id, attempt_id, question_id,
		row_number() OVER (PARTITION BY attempt_id, question_id ORDER BY created_at DESC, id DESC) AS row_number,
		first_value(id) OVER (PARTITION BY attempt_id, question_id ORDER BY created_at DESC, id DESC) AS retained_id
	FROM assessment_responses
)
INSERT INTO grade_score_repair_evidence (migration_key, entity_type, entity_id, reason, original_data, repaired_data)
SELECT '0017:duplicate-assessment-response:' || response.id,
	'assessment_response', response.id, 'duplicate_attempt_question',
	row_to_json(response), json_build_object('retainedResponseId', ranked.retained_id)
FROM ranked_responses ranked
JOIN assessment_responses response ON response.id = ranked.id
WHERE ranked.row_number > 1
ON CONFLICT (migration_key) DO NOTHING;--> statement-breakpoint
WITH ranked_responses AS (
	SELECT id, row_number() OVER (PARTITION BY attempt_id, question_id ORDER BY created_at DESC, id DESC) AS row_number
	FROM assessment_responses
)
DELETE FROM assessment_responses response USING ranked_responses ranked
WHERE response.id = ranked.id AND ranked.row_number > 1;--> statement-breakpoint
INSERT INTO grade_score_repair_evidence (migration_key, entity_type, entity_id, reason, original_data, repaired_data)
SELECT '0017:assessment-attempt:' || attempt.id,
	'assessment_attempt', attempt.id, 'legacy_score_normalization',
	json_build_object(
		'score', attempt.score,
		'directScore', attempt.direct_score,
		'basePointsEarned', attempt.base_points_earned,
		'possiblePointsSnapshot', attempt.possible_points_snapshot
	),
	json_build_object(
		'score', CASE WHEN attempt.score IS NULL THEN NULL ELSE LEAST(100, GREATEST(0, attempt.score)) END,
		'directScore', CASE WHEN attempt.direct_score IS NULL THEN NULL ELSE LEAST(100, GREATEST(0, attempt.direct_score)) END,
		'provenance', 'reconstructed_from_responses_then_compatibility_score'
	)
FROM assessment_attempts attempt
WHERE attempt.score IS NOT NULL AND (
	attempt.score < 0 OR attempt.score > 100 OR
	attempt.direct_score < 0 OR attempt.direct_score > 100 OR
	attempt.base_points_earned IS NULL OR attempt.possible_points_snapshot IS NULL
)
ON CONFLICT (migration_key) DO NOTHING;--> statement-breakpoint
WITH attempt_evidence AS (
	SELECT attempt.id,
		COALESCE(
			NULLIF(question_totals.possible_points, 0),
			NULLIF(assessment.total_points, 0),
			CASE WHEN attempt.direct_score IS NOT NULL THEN 100 END
		)::numeric AS possible_points,
		response_totals.earned_points
	FROM assessment_attempts attempt
	JOIN assessments assessment ON assessment.id = attempt.assessment_id
	LEFT JOIN LATERAL (
		SELECT SUM(question.points)::numeric AS possible_points
		FROM assessment_questions question
		WHERE question.assessment_id = attempt.assessment_id
	) question_totals ON true
	LEFT JOIN LATERAL (
		SELECT SUM(response.points_earned)::numeric AS earned_points
		FROM assessment_responses response
		WHERE response.attempt_id = attempt.id
	) response_totals ON true
)
UPDATE assessment_attempts attempt
SET score = CASE WHEN attempt.score IS NULL THEN NULL ELSE LEAST(100, GREATEST(0, attempt.score)) END,
	direct_score = CASE WHEN attempt.direct_score IS NULL THEN NULL ELSE LEAST(100, GREATEST(0, attempt.direct_score)) END,
	possible_points_snapshot = COALESCE(attempt.possible_points_snapshot, CASE WHEN evidence.possible_points > 0 THEN evidence.possible_points END),
	base_points_earned = COALESCE(
		attempt.base_points_earned,
		CASE WHEN evidence.possible_points > 0 THEN
			LEAST(evidence.possible_points, GREATEST(0, COALESCE(
				evidence.earned_points,
				(attempt.direct_score::numeric / 100) * evidence.possible_points,
				(attempt.score::numeric / 100) * evidence.possible_points
			)))
		END
	)
FROM attempt_evidence evidence
WHERE evidence.id = attempt.id;--> statement-breakpoint
INSERT INTO grade_score_repair_evidence (migration_key, entity_type, entity_id, reason, original_data, repaired_data)
SELECT '0017:class-record-score:' || score.id,
	'class_record_score', score.id, 'base_score_above_item_maximum',
	json_build_object('score', score.score, 'maximum', item.max_score),
	json_build_object('score', item.max_score, 'provenance', 'bounded_legacy_base_score')
FROM class_record_scores score
JOIN class_record_items item ON item.id = score.gradebook_item_id
WHERE score.status = 'recorded' AND score.score > item.max_score
ON CONFLICT (migration_key) DO NOTHING;--> statement-breakpoint
UPDATE class_record_scores score
SET score = item.max_score, updated_at = now()
FROM class_record_items item
WHERE item.id = score.gradebook_item_id
	AND score.status = 'recorded'
	AND score.score > item.max_score;--> statement-breakpoint
INSERT INTO grade_score_repair_evidence (migration_key, entity_type, entity_id, reason, original_data, repaired_data)
SELECT '0017:class-record-final-grade:' || grade.id,
	'class_record_final_grade', grade.id, 'percentage_out_of_range',
	json_build_object('finalPercentage', grade.final_percentage),
	json_build_object('finalPercentage', LEAST(100, GREATEST(0, grade.final_percentage)))
FROM class_record_final_grades grade
WHERE grade.final_percentage < 0 OR grade.final_percentage > 100
ON CONFLICT (migration_key) DO NOTHING;--> statement-breakpoint
UPDATE class_record_final_grades
SET final_percentage = LEAST(100, GREATEST(0, final_percentage))
WHERE final_percentage < 0 OR final_percentage > 100;--> statement-breakpoint
INSERT INTO grade_score_repair_evidence (migration_key, entity_type, entity_id, reason, original_data, repaired_data)
SELECT '0017:performance-snapshot:' || snapshot.id,
	'performance_snapshot', snapshot.id, 'percentage_out_of_range',
	json_build_object('assessmentAverage', snapshot.assessment_average, 'classRecordAverage', snapshot.class_record_average, 'blendedScore', snapshot.blended_score, 'thresholdApplied', snapshot.threshold_applied),
	json_build_object('provenance', 'deleted_derived_projection_for_canonical_recompute')
FROM performance_snapshots snapshot
WHERE assessment_average NOT BETWEEN 0 AND 100 OR class_record_average NOT BETWEEN 0 AND 100 OR blended_score NOT BETWEEN 0 AND 100 OR threshold_applied NOT BETWEEN 0 AND 100
ON CONFLICT (migration_key) DO NOTHING;--> statement-breakpoint
DELETE FROM performance_snapshots
WHERE assessment_average NOT BETWEEN 0 AND 100 OR class_record_average NOT BETWEEN 0 AND 100 OR blended_score NOT BETWEEN 0 AND 100 OR threshold_applied NOT BETWEEN 0 AND 100;--> statement-breakpoint
INSERT INTO grade_score_repair_evidence (migration_key, entity_type, entity_id, reason, original_data, repaired_data)
SELECT '0017:performance-log:' || log.id,
	'performance_log', log.id, 'percentage_out_of_range',
	json_build_object('assessmentAverage', log.assessment_average, 'classRecordAverage', log.class_record_average, 'blendedScore', log.blended_score, 'thresholdApplied', log.threshold_applied),
	json_build_object('provenance', 'bounded_derived_projection')
FROM performance_logs log
WHERE assessment_average NOT BETWEEN 0 AND 100 OR class_record_average NOT BETWEEN 0 AND 100 OR blended_score NOT BETWEEN 0 AND 100 OR threshold_applied NOT BETWEEN 0 AND 100
ON CONFLICT (migration_key) DO NOTHING;--> statement-breakpoint
UPDATE performance_logs
SET assessment_average = CASE WHEN assessment_average IS NULL THEN NULL ELSE LEAST(100, GREATEST(0, assessment_average)) END,
	class_record_average = CASE WHEN class_record_average IS NULL THEN NULL ELSE LEAST(100, GREATEST(0, class_record_average)) END,
	blended_score = CASE WHEN blended_score IS NULL THEN NULL ELSE LEAST(100, GREATEST(0, blended_score)) END,
	threshold_applied = LEAST(100, GREATEST(0, threshold_applied))
WHERE assessment_average NOT BETWEEN 0 AND 100 OR class_record_average NOT BETWEEN 0 AND 100 OR blended_score NOT BETWEEN 0 AND 100 OR threshold_applied NOT BETWEEN 0 AND 100;--> statement-breakpoint
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_attempt_question_unique" UNIQUE("attempt_id","question_id");--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_score_range_valid" CHECK ("assessment_attempts"."score" IS NULL OR ("assessment_attempts"."score" >= 0 AND "assessment_attempts"."score" <= 100));--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_direct_score_range_valid" CHECK ("assessment_attempts"."direct_score" IS NULL OR ("assessment_attempts"."direct_score" >= 0 AND "assessment_attempts"."direct_score" <= 100));--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_point_evidence_valid" CHECK (("assessment_attempts"."base_points_earned" IS NULL OR "assessment_attempts"."base_points_earned" >= 0) AND ("assessment_attempts"."possible_points_snapshot" IS NULL OR "assessment_attempts"."possible_points_snapshot" > 0) AND ("assessment_attempts"."base_points_earned" IS NULL OR "assessment_attempts"."possible_points_snapshot" IS NULL OR "assessment_attempts"."base_points_earned" <= "assessment_attempts"."possible_points_snapshot") AND "assessment_attempts"."bonus_points" >= 0 AND ("assessment_attempts"."bonus_points" = 0 OR ("assessment_attempts"."bonus_reason" IS NOT NULL AND length(trim("assessment_attempts"."bonus_reason")) > 0)));--> statement-breakpoint
ALTER TABLE "class_record_final_grades" ADD CONSTRAINT "class_record_final_grades_percentage_range_valid" CHECK ("class_record_final_grades"."final_percentage" >= 0 AND "class_record_final_grades"."final_percentage" <= 100);--> statement-breakpoint
ALTER TABLE "class_record_scores" ADD CONSTRAINT "class_record_score_status_valid" CHECK (("class_record_scores"."status" = 'recorded' AND "class_record_scores"."score" IS NOT NULL AND "class_record_scores"."score" >= 0 AND "class_record_scores"."bonus_points" >= 0 AND ("class_record_scores"."bonus_points" = 0 OR ("class_record_scores"."bonus_reason" IS NOT NULL AND length(trim("class_record_scores"."bonus_reason")) > 0))) OR ("class_record_scores"."status" = 'excused' AND "class_record_scores"."score" IS NULL AND "class_record_scores"."bonus_points" = 0 AND length(trim("class_record_scores"."reason")) > 0 AND "class_record_scores"."reason" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "performance_logs" ADD CONSTRAINT "performance_logs_score_range_valid" CHECK (("performance_logs"."assessment_average" IS NULL OR ("performance_logs"."assessment_average" >= 0 AND "performance_logs"."assessment_average" <= 100)) AND ("performance_logs"."class_record_average" IS NULL OR ("performance_logs"."class_record_average" >= 0 AND "performance_logs"."class_record_average" <= 100)) AND ("performance_logs"."blended_score" IS NULL OR ("performance_logs"."blended_score" >= 0 AND "performance_logs"."blended_score" <= 100)) AND ("performance_logs"."threshold_applied" >= 0 AND "performance_logs"."threshold_applied" <= 100));--> statement-breakpoint
ALTER TABLE "performance_snapshots" ADD CONSTRAINT "performance_snapshots_score_range_valid" CHECK (("performance_snapshots"."assessment_average" IS NULL OR ("performance_snapshots"."assessment_average" >= 0 AND "performance_snapshots"."assessment_average" <= 100)) AND ("performance_snapshots"."class_record_average" IS NULL OR ("performance_snapshots"."class_record_average" >= 0 AND "performance_snapshots"."class_record_average" <= 100)) AND ("performance_snapshots"."blended_score" IS NULL OR ("performance_snapshots"."blended_score" >= 0 AND "performance_snapshots"."blended_score" <= 100)) AND ("performance_snapshots"."threshold_applied" >= 0 AND "performance_snapshots"."threshold_applied" <= 100));
