-- Migration: add pending_roster table
-- Purpose: stores imported roster rows for students who do not yet have an LMS account.
-- These rows are linked to a section and can later be resolved (claimed) by a registered student.

CREATE TABLE IF NOT EXISTS "pending_roster" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "section_id"       UUID NOT NULL REFERENCES "sections"("id") ON DELETE CASCADE,
  "last_name"        TEXT NOT NULL,
  "first_name"       TEXT NOT NULL,
  "middle_initial"   TEXT,
  "lrn"              VARCHAR(12) NOT NULL,
  "roster_email"     TEXT NOT NULL,
  "resolved_at"      TIMESTAMP,
  "resolved_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "imported_at"      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "pending_roster_section_id_idx" ON "pending_roster"("section_id");
CREATE INDEX IF NOT EXISTS "pending_roster_roster_email_idx" ON "pending_roster"("roster_email");
