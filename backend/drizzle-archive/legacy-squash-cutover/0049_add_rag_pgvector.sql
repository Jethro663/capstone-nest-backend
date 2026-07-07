CREATE EXTENSION IF NOT EXISTS vector;

DO $$ BEGIN
  CREATE TYPE "content_source_type" AS ENUM (
    'lesson_block',
    'extracted_module',
    'assessment_question'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ai_generation_job_type" AS ENUM (
    'quiz_generation',
    'remedial_plan_generation',
    'reindexing',
    'backfill'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ai_generation_output_type" AS ENUM (
    'assessment_draft',
    'intervention_recommendation'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ai_generation_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'approved',
    'rejected',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "assessment_questions"
  ADD COLUMN IF NOT EXISTS "concept_tags" jsonb;

ALTER TABLE "assessments"
  ADD COLUMN IF NOT EXISTS "ai_origin" text;

ALTER TABLE "assessments"
  ADD COLUMN IF NOT EXISTS "ai_generation_output_id" uuid;

CREATE TABLE IF NOT EXISTS "content_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_type" "content_source_type" NOT NULL,
  "source_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "lesson_id" uuid,
  "assessment_id" uuid,
  "question_id" uuid,
  "extraction_id" uuid,
  "chunk_text" text NOT NULL,
  "chunk_order" integer NOT NULL DEFAULT 0,
  "token_count" integer NOT NULL DEFAULT 0,
  "content_hash" text NOT NULL,
  "metadata_json" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "content_chunk_embeddings" (
  "chunk_id" uuid PRIMARY KEY NOT NULL,
  "embedding" vector(768) NOT NULL,
  "embedding_model" text NOT NULL,
  "embedded_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "student_concept_mastery" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "concept_key" text NOT NULL,
  "evidence_count" integer NOT NULL DEFAULT 0,
  "error_count" integer NOT NULL DEFAULT 0,
  "mastery_score" integer NOT NULL DEFAULT 0,
  "last_seen_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ai_generation_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_type" "ai_generation_job_type" NOT NULL,
  "class_id" uuid,
  "teacher_id" uuid,
  "status" "ai_generation_status" NOT NULL DEFAULT 'pending',
  "source_filters" jsonb,
  "error_message" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ai_generation_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL,
  "output_type" "ai_generation_output_type" NOT NULL,
  "target_class_id" uuid,
  "target_teacher_id" uuid,
  "source_filters" jsonb,
  "structured_output" jsonb NOT NULL,
  "status" "ai_generation_status" NOT NULL DEFAULT 'completed',
  "approved_by" uuid,
  "approved_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "content_chunks"
    ADD CONSTRAINT "content_chunks_class_id_classes_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "content_chunks"
    ADD CONSTRAINT "content_chunks_lesson_id_lessons_id_fk"
    FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "content_chunks"
    ADD CONSTRAINT "content_chunks_assessment_id_assessments_id_fk"
    FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "content_chunks"
    ADD CONSTRAINT "content_chunks_question_id_assessment_questions_id_fk"
    FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "content_chunks"
    ADD CONSTRAINT "content_chunks_extraction_id_extracted_modules_id_fk"
    FOREIGN KEY ("extraction_id") REFERENCES "public"."extracted_modules"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "content_chunk_embeddings"
    ADD CONSTRAINT "content_chunk_embeddings_chunk_id_content_chunks_id_fk"
    FOREIGN KEY ("chunk_id") REFERENCES "public"."content_chunks"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "student_concept_mastery"
    ADD CONSTRAINT "student_concept_mastery_student_id_users_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "student_concept_mastery"
    ADD CONSTRAINT "student_concept_mastery_class_id_classes_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_generation_jobs"
    ADD CONSTRAINT "ai_generation_jobs_class_id_classes_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_generation_jobs"
    ADD CONSTRAINT "ai_generation_jobs_teacher_id_users_id_fk"
    FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_generation_outputs"
    ADD CONSTRAINT "ai_generation_outputs_job_id_ai_generation_jobs_id_fk"
    FOREIGN KEY ("job_id") REFERENCES "public"."ai_generation_jobs"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_generation_outputs"
    ADD CONSTRAINT "ai_generation_outputs_target_class_id_classes_id_fk"
    FOREIGN KEY ("target_class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_generation_outputs"
    ADD CONSTRAINT "ai_generation_outputs_target_teacher_id_users_id_fk"
    FOREIGN KEY ("target_teacher_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_generation_outputs"
    ADD CONSTRAINT "ai_generation_outputs_approved_by_users_id_fk"
    FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "content_chunks_class_id_idx"
  ON "content_chunks" ("class_id");
CREATE INDEX IF NOT EXISTS "content_chunks_source_type_source_id_idx"
  ON "content_chunks" ("source_type", "source_id");
CREATE INDEX IF NOT EXISTS "content_chunks_lesson_id_idx"
  ON "content_chunks" ("lesson_id");
CREATE INDEX IF NOT EXISTS "content_chunks_assessment_id_idx"
  ON "content_chunks" ("assessment_id");
CREATE INDEX IF NOT EXISTS "content_chunks_question_id_idx"
  ON "content_chunks" ("question_id");
CREATE INDEX IF NOT EXISTS "content_chunks_extraction_id_idx"
  ON "content_chunks" ("extraction_id");

CREATE INDEX IF NOT EXISTS "content_chunk_embeddings_model_idx"
  ON "content_chunk_embeddings" ("embedding_model");

CREATE UNIQUE INDEX IF NOT EXISTS "student_concept_mastery_student_class_concept_idx"
  ON "student_concept_mastery" ("student_id", "class_id", "concept_key");
CREATE INDEX IF NOT EXISTS "student_concept_mastery_class_id_idx"
  ON "student_concept_mastery" ("class_id");

CREATE INDEX IF NOT EXISTS "ai_generation_jobs_class_id_idx"
  ON "ai_generation_jobs" ("class_id");
CREATE INDEX IF NOT EXISTS "ai_generation_jobs_teacher_id_idx"
  ON "ai_generation_jobs" ("teacher_id");
CREATE INDEX IF NOT EXISTS "ai_generation_jobs_status_idx"
  ON "ai_generation_jobs" ("status");

CREATE INDEX IF NOT EXISTS "ai_generation_outputs_job_id_idx"
  ON "ai_generation_outputs" ("job_id");
CREATE INDEX IF NOT EXISTS "ai_generation_outputs_target_class_id_idx"
  ON "ai_generation_outputs" ("target_class_id");
CREATE INDEX IF NOT EXISTS "ai_generation_outputs_target_teacher_id_idx"
  ON "ai_generation_outputs" ("target_teacher_id");
CREATE INDEX IF NOT EXISTS "ai_generation_outputs_status_idx"
  ON "ai_generation_outputs" ("status");

CREATE INDEX IF NOT EXISTS "content_chunk_embeddings_embedding_hnsw_idx"
  ON "content_chunk_embeddings"
  USING hnsw ("embedding" vector_cosine_ops);
