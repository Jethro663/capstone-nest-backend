DO $$ BEGIN
  ALTER TYPE "ja_session_mode" ADD VALUE IF NOT EXISTS 'review';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ja_thread_status" AS ENUM ('active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ja_thread_message_role" AS ENUM ('student', 'assistant', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ja_guardrail_event_type" AS ENUM ('blocked_prompt');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ja_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "title" text NOT NULL DEFAULT 'JA Ask Thread',
  "status" "ja_thread_status" NOT NULL DEFAULT 'active',
  "last_message_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ja_thread_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "role" "ja_thread_message_role" NOT NULL,
  "content" text NOT NULL,
  "citations_json" jsonb,
  "quick_action" text,
  "blocked" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ja_guardrail_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "thread_id" uuid,
  "message_id" uuid,
  "event_type" "ja_guardrail_event_type" NOT NULL,
  "payload_json" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "ja_threads"
    ADD CONSTRAINT "ja_threads_student_id_users_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ja_threads"
    ADD CONSTRAINT "ja_threads_class_id_classes_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ja_thread_messages"
    ADD CONSTRAINT "ja_thread_messages_thread_id_ja_threads_id_fk"
    FOREIGN KEY ("thread_id") REFERENCES "public"."ja_threads"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ja_guardrail_events"
    ADD CONSTRAINT "ja_guardrail_events_student_id_users_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ja_guardrail_events"
    ADD CONSTRAINT "ja_guardrail_events_class_id_classes_id_fk"
    FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ja_guardrail_events"
    ADD CONSTRAINT "ja_guardrail_events_thread_id_ja_threads_id_fk"
    FOREIGN KEY ("thread_id") REFERENCES "public"."ja_threads"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ja_guardrail_events"
    ADD CONSTRAINT "ja_guardrail_events_message_id_ja_thread_messages_id_fk"
    FOREIGN KEY ("message_id") REFERENCES "public"."ja_thread_messages"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ja_threads_student_class_idx"
  ON "ja_threads" ("student_id", "class_id");
CREATE INDEX IF NOT EXISTS "ja_threads_class_status_idx"
  ON "ja_threads" ("class_id", "status");
CREATE INDEX IF NOT EXISTS "ja_thread_messages_thread_created_at_idx"
  ON "ja_thread_messages" ("thread_id", "created_at");
CREATE INDEX IF NOT EXISTS "ja_guardrail_events_student_class_idx"
  ON "ja_guardrail_events" ("student_id", "class_id");
CREATE INDEX IF NOT EXISTS "ja_guardrail_events_thread_created_at_idx"
  ON "ja_guardrail_events" ("thread_id", "created_at");
