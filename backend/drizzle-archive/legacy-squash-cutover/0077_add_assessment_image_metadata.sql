ALTER TABLE "assessment_questions"
ADD COLUMN IF NOT EXISTS "metadata" json;

ALTER TABLE "assessment_question_options"
ADD COLUMN IF NOT EXISTS "image_url" text;

ALTER TABLE "assessment_question_options"
ADD COLUMN IF NOT EXISTS "metadata" json;
