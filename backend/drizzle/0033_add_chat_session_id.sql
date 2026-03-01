-- Migration: Add session_id column to ai_interaction_logs for multi-turn chat
-- This groups messages into conversations so JAKIPIR (Ja) can remember context.

ALTER TABLE "ai_interaction_logs"
ADD COLUMN IF NOT EXISTS "session_id" uuid;

CREATE INDEX IF NOT EXISTS "ai_interaction_logs_session_id_idx"
ON "ai_interaction_logs" ("session_id");
