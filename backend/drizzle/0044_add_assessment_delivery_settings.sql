ALTER TABLE "assessments"
ADD COLUMN "close_when_due" boolean NOT NULL DEFAULT true,
ADD COLUMN "randomize_questions" boolean NOT NULL DEFAULT false;
