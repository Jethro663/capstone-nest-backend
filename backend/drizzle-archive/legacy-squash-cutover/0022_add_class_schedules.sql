-- Migration: 0022_add_class_schedules
-- Replaces the free-text `schedule` column on `classes` with a structured
-- `class_schedules` table (one class → many time slots), enabling calendar
-- rendering and server-side collision detection.

-- ─── Step 1: Create the class_schedules table ──────────────────────────────

CREATE TABLE IF NOT EXISTS "class_schedules" (
  "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "class_id"   uuid        NOT NULL,
  "days"       text[]      NOT NULL,
  "start_time" text        NOT NULL,
  "end_time"   text        NOT NULL,
  "created_at" timestamp   DEFAULT now() NOT NULL,
  "updated_at" timestamp   DEFAULT now() NOT NULL,
  CONSTRAINT "class_schedules_class_id_fkey"
    FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "class_schedules_class_id_idx"
  ON "class_schedules" ("class_id");

-- ─── Step 2: Migrate existing schedule text data ───────────────────────────
-- Old format: "M,W,F 10:00 - 11:00"  (days<space>startTime<space>-<space>endTime)
-- regexp_split_to_array splits on one or more whitespace characters:
--   [1] = "M,W,F"  → split by comma → text[]
--   [2] = "10:00"  → start_time
--   [4] = "11:00"  → end_time  (position 3 is the "-" separator)

INSERT INTO "class_schedules" ("id", "class_id", "days", "start_time", "end_time")
SELECT
  gen_random_uuid(),
  id,
  string_to_array(
    (regexp_split_to_array(trim(schedule), '\s+'))[1],
    ','
  ),
  (regexp_split_to_array(trim(schedule), '\s+'))[2],
  (regexp_split_to_array(trim(schedule), '\s+'))[4]
FROM "classes"
WHERE schedule IS NOT NULL
  AND trim(schedule) != '';

-- ─── Step 3: Drop the old schedule column ──────────────────────────────────

ALTER TABLE "classes" DROP COLUMN IF EXISTS "schedule";
