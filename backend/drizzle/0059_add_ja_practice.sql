DO $$ BEGIN
  CREATE TYPE "ja_session_mode" AS ENUM ('practice');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ja_session_status" AS ENUM ('active', 'completed', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ja_reward_state" AS ENUM ('pending', 'awarded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ja_session_event_type" AS ENUM (
    'focus_lost',
    'focus_restored',
    'focus_strike',
    'resumed',
    'completed',
    'deleted'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ja_xp_event_type" AS ENUM ('session_completion');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ja_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "mode" "ja_session_mode" NOT NULL DEFAULT 'practice',
  "status" "ja_session_status" NOT NULL DEFAULT 'active',
  "question_count" integer NOT NULL DEFAULT 10,
  "current_index" integer NOT NULL DEFAULT 0,
  "strike_count" integer NOT NULL DEFAULT 0,
  "reward_state" "ja_reward_state" NOT NULL DEFAULT 'pending',
  "source_snapshot_json" jsonb,
  "grounding_status" text NOT NULL DEFAULT 'grounded',
  "started_at" timestamp NOT NULL DEFAULT now(),
  "completed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ja_session_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL,
  "order_index" integer NOT NULL,
  "item_type" text NOT NULL,
  "prompt" text NOT NULL,
  "options_json" jsonb,
  "answer_key_json" jsonb NOT NULL,
  "hint" text,
  "explanation" text,
  "citations_json" jsonb,
  "validation_json" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ja_session_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_item_id" uuid NOT NULL,
  "student_answer_json" jsonb NOT NULL,
  "is_correct" boolean NOT NULL DEFAULT false,
  "score_delta" integer NOT NULL DEFAULT 0,
  "feedback" text,
  "answered_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ja_session_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL,
  "event_type" "ja_session_event_type" NOT NULL,
  "payload_json" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ja_progress" (
  "student_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "xp_total" integer NOT NULL DEFAULT 0,
  "streak_days" integer NOT NULL DEFAULT 0,
  "sessions_completed" integer NOT NULL DEFAULT 0,
  "last_activity_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "ja_progress_student_id_class_id_pk" PRIMARY KEY("student_id", "class_id")
);

CREATE TABLE IF NOT EXISTS "ja_xp_ledger" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "session_id" uuid,
  "event_type" "ja_xp_event_type" NOT NULL DEFAULT 'session_completion',
  "xp_delta" integer NOT NULL,
  "metadata_json" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "ja_sessions"
    ADD CONSTRAINT "ja_sessions_student_id_users_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ja_sessions"
    ADD CONSTRAINT "ja_sessions_class_id_classes_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ja_session_items"
    ADD CONSTRAINT "ja_session_items_session_id_ja_sessions_id_fk"
    FOREIGN KEY ("session_id") REFERENCES "public"."ja_sessions"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ja_session_responses"
    ADD CONSTRAINT "ja_session_responses_session_item_id_ja_session_items_id_fk"
    FOREIGN KEY ("session_item_id") REFERENCES "public"."ja_session_items"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ja_session_events"
    ADD CONSTRAINT "ja_session_events_session_id_ja_sessions_id_fk"
    FOREIGN KEY ("session_id") REFERENCES "public"."ja_sessions"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ja_progress"
    ADD CONSTRAINT "ja_progress_student_id_users_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ja_progress"
    ADD CONSTRAINT "ja_progress_class_id_classes_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ja_xp_ledger"
    ADD CONSTRAINT "ja_xp_ledger_student_id_users_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ja_xp_ledger"
    ADD CONSTRAINT "ja_xp_ledger_class_id_classes_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ja_xp_ledger"
    ADD CONSTRAINT "ja_xp_ledger_session_id_ja_sessions_id_fk"
    FOREIGN KEY ("session_id") REFERENCES "public"."ja_sessions"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ja_sessions_student_status_idx"
  ON "ja_sessions" ("student_id", "status");
CREATE INDEX IF NOT EXISTS "ja_sessions_class_status_idx"
  ON "ja_sessions" ("class_id", "status");
CREATE INDEX IF NOT EXISTS "ja_sessions_started_at_idx"
  ON "ja_sessions" ("started_at");
CREATE INDEX IF NOT EXISTS "ja_session_items_session_idx"
  ON "ja_session_items" ("session_id");
CREATE INDEX IF NOT EXISTS "ja_session_events_session_created_at_idx"
  ON "ja_session_events" ("session_id", "created_at");
CREATE INDEX IF NOT EXISTS "ja_progress_class_idx"
  ON "ja_progress" ("class_id");
CREATE INDEX IF NOT EXISTS "ja_xp_ledger_student_class_idx"
  ON "ja_xp_ledger" ("student_id", "class_id");

CREATE UNIQUE INDEX IF NOT EXISTS "ja_session_items_session_order_unique"
  ON "ja_session_items" ("session_id", "order_index");
CREATE UNIQUE INDEX IF NOT EXISTS "ja_session_responses_session_item_unique"
  ON "ja_session_responses" ("session_item_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ja_xp_ledger_session_event_unique"
  ON "ja_xp_ledger" ("session_id", "event_type");
