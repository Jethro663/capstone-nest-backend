CREATE TABLE IF NOT EXISTS "class_template_lessons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_id" uuid NOT NULL REFERENCES "class_templates"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "summary" text,
  "order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "class_template_lessons_template_order_idx"
  ON "class_template_lessons" ("template_id", "order");

CREATE TABLE IF NOT EXISTS "class_template_lesson_blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_lesson_id" uuid NOT NULL REFERENCES "class_template_lessons"("id") ON DELETE CASCADE,
  "block_type" text NOT NULL,
  "block_version" integer NOT NULL DEFAULT 1,
  "payload" json NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "class_template_lesson_blocks_lesson_order_idx"
  ON "class_template_lesson_blocks" ("template_lesson_id", "order");

CREATE TABLE IF NOT EXISTS "class_template_assessment_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_assessment_id" uuid NOT NULL REFERENCES "class_template_assessments"("id") ON DELETE CASCADE,
  "type" text NOT NULL DEFAULT 'multiple_choice',
  "content" text NOT NULL,
  "points" integer NOT NULL DEFAULT 1,
  "order" integer NOT NULL DEFAULT 0,
  "is_required" boolean NOT NULL DEFAULT true,
  "explanation" text,
  "image_url" text,
  "metadata" json,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "class_template_assessment_questions_assessment_order_idx"
  ON "class_template_assessment_questions" ("template_assessment_id", "order");

CREATE TABLE IF NOT EXISTS "class_template_assessment_question_options" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_assessment_question_id" uuid NOT NULL REFERENCES "class_template_assessment_questions"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "is_correct" boolean NOT NULL DEFAULT false,
  "order" integer NOT NULL DEFAULT 0,
  "metadata" json,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "class_template_assessment_question_options_question_order_idx"
  ON "class_template_assessment_question_options" ("template_assessment_question_id", "order");

CREATE TABLE IF NOT EXISTS "class_template_engine_chunks" (
  "id" varchar(190) PRIMARY KEY,
  "template_id" uuid NOT NULL REFERENCES "class_templates"("id") ON DELETE CASCADE,
  "source_type" text NOT NULL,
  "source_id" text NOT NULL,
  "chunk_order" integer NOT NULL DEFAULT 0,
  "content" text NOT NULL,
  "metadata" json,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "class_template_engine_chunks_template_order_idx"
  ON "class_template_engine_chunks" ("template_id", "chunk_order");
CREATE INDEX IF NOT EXISTS "class_template_engine_chunks_source_idx"
  ON "class_template_engine_chunks" ("template_id", "source_type", "source_id");

ALTER TABLE "lessons"
  ADD COLUMN IF NOT EXISTS "is_core_template_asset" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "template_id" uuid,
  ADD COLUMN IF NOT EXISTS "template_source_id" uuid;

CREATE INDEX IF NOT EXISTS "lessons_template_id_idx"
  ON "lessons" ("template_id");
CREATE INDEX IF NOT EXISTS "lessons_template_source_id_idx"
  ON "lessons" ("template_source_id");

ALTER TABLE "class_template_module_items"
  ADD COLUMN IF NOT EXISTS "template_lesson_id" uuid REFERENCES "class_template_lessons"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "class_template_module_items_template_lesson_idx"
  ON "class_template_module_items" ("template_lesson_id");

INSERT INTO "class_template_lessons" (
  "id",
  "template_id",
  "title",
  "summary",
  "order"
)
SELECT
  mi."id",
  tm."template_id",
  COALESCE(NULLIF(mi."metadata"->>'lessonTitle', ''), 'Untitled Lesson'),
  mi."metadata"->>'lessonSummary',
  COALESCE(mi."order", 0)
FROM "class_template_module_items" mi
INNER JOIN "class_template_module_sections" ts
  ON ts."id" = mi."template_section_id"
INNER JOIN "class_template_modules" tm
  ON tm."id" = ts."template_module_id"
WHERE mi."item_type" = 'lesson'
ON CONFLICT ("id") DO NOTHING;

UPDATE "class_template_module_items"
SET "template_lesson_id" = "id"
WHERE "item_type" = 'lesson'
  AND "template_lesson_id" IS NULL;

WITH lesson_items AS (
  SELECT
    mi."id" AS item_id,
    COALESCE(mi."metadata"->'lessonBlocks', mi."metadata"->'contentBlocks', '[]'::json) AS blocks
  FROM "class_template_module_items" mi
  WHERE mi."item_type" = 'lesson'
),
expanded_blocks AS (
  SELECT
    li.item_id,
    block.value AS block_json,
    block.ordinality AS block_order
  FROM lesson_items li
  CROSS JOIN LATERAL json_array_elements(li.blocks) WITH ORDINALITY AS block(value, ordinality)
)
INSERT INTO "class_template_lesson_blocks" (
  "template_lesson_id",
  "block_type",
  "block_version",
  "payload",
  "order"
)
SELECT
  eb.item_id,
  COALESCE(NULLIF(eb.block_json->>'type', ''), 'text'),
  COALESCE(NULLIF(eb.block_json->>'blockVersion', '')::integer, 1),
  json_build_object(
    'content',
    COALESCE(eb.block_json->'content', 'null'::json),
    'metadata',
    COALESCE(eb.block_json->'metadata', '{}'::json)
  ),
  eb.block_order
FROM expanded_blocks eb;

WITH expanded_questions AS (
  SELECT
    a."id" AS assessment_id,
    question.value AS question_json,
    question.ordinality AS question_order
  FROM "class_template_assessments" a
  CROSS JOIN LATERAL json_array_elements(COALESCE(a."questions", '[]'::json)) WITH ORDINALITY AS question(value, ordinality)
),
inserted_questions AS (
  INSERT INTO "class_template_assessment_questions" (
    "id",
    "template_assessment_id",
    "type",
    "content",
    "points",
    "order",
    "is_required",
    "explanation",
    "image_url",
    "metadata"
  )
  SELECT
    gen_random_uuid(),
    eq.assessment_id,
    COALESCE(NULLIF(eq.question_json->>'type', ''), 'multiple_choice'),
    COALESCE(NULLIF(eq.question_json->>'content', ''), '<p></p>'),
    COALESCE(NULLIF(eq.question_json->>'points', '')::integer, 1),
    COALESCE(NULLIF(eq.question_json->>'order', '')::integer, eq.question_order),
    COALESCE(NULLIF(eq.question_json->>'isRequired', '')::boolean, true),
    eq.question_json->>'explanation',
    eq.question_json->>'imageUrl',
    '{}'::json
  FROM expanded_questions eq
  RETURNING "id", "template_assessment_id", "order"
),
questions_with_json AS (
  SELECT
    iq."id" AS inserted_question_id,
    eq.question_json
  FROM inserted_questions iq
  INNER JOIN expanded_questions eq
    ON eq.assessment_id = iq.template_assessment_id
    AND COALESCE(NULLIF(eq.question_json->>'order', '')::integer, eq.question_order) = iq."order"
)
INSERT INTO "class_template_assessment_question_options" (
  "template_assessment_question_id",
  "text",
  "is_correct",
  "order",
  "metadata"
)
SELECT
  qwj.inserted_question_id,
  COALESCE(NULLIF(option.value->>'text', ''), ''),
  COALESCE(NULLIF(option.value->>'isCorrect', '')::boolean, false),
  COALESCE(NULLIF(option.value->>'order', '')::integer, option.ordinality),
  '{}'::json
FROM questions_with_json qwj
CROSS JOIN LATERAL json_array_elements(COALESCE(qwj.question_json->'options', '[]'::json)) WITH ORDINALITY AS option(value, ordinality);

ALTER TABLE "class_template_assessments"
  DROP COLUMN IF EXISTS "questions";
