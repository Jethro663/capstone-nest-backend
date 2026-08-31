CREATE TABLE "assessment_editor_receipts" (
	"actor_id" uuid NOT NULL,
	"mutation_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_editor_receipts_actor_id_mutation_id_pk" PRIMARY KEY("actor_id","mutation_id")
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "editor_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_editor_receipts" ADD CONSTRAINT "assessment_editor_receipts_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_editor_receipts" ADD CONSTRAINT "assessment_editor_receipts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION bump_assessment_editor_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.editor_revision := OLD.editor_revision + 1;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER assessment_editor_revision BEFORE UPDATE ON assessments
FOR EACH ROW EXECUTE FUNCTION bump_assessment_editor_revision();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION touch_question_assessment_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE assessments SET updated_at = now() WHERE id = OLD.assessment_id;
  ELSE
    UPDATE assessments SET updated_at = now() WHERE id = NEW.assessment_id;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER question_editor_revision AFTER INSERT OR UPDATE OR DELETE ON assessment_questions
FOR EACH ROW EXECUTE FUNCTION touch_question_assessment_revision();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION touch_option_assessment_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_question uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN target_question := OLD.question_id;
  ELSE target_question := NEW.question_id; END IF;
  UPDATE assessments SET updated_at = now()
    WHERE id = (SELECT assessment_id FROM assessment_questions WHERE id = target_question);
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER option_editor_revision AFTER INSERT OR UPDATE OR DELETE ON assessment_question_options
FOR EACH ROW EXECUTE FUNCTION touch_option_assessment_revision();
