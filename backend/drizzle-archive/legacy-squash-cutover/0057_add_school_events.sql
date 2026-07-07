DO $$
BEGIN
  CREATE TYPE school_event_type AS ENUM ('school_event', 'holiday_break');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS school_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  event_type school_event_type DEFAULT 'school_event' NOT NULL,
  school_year text NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  starts_at timestamp NOT NULL,
  ends_at timestamp NOT NULL,
  all_day boolean DEFAULT true NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL,
  archived_at timestamp,
  CONSTRAINT school_events_date_range_chk CHECK (ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS school_events_school_year_idx
  ON school_events (school_year);

CREATE INDEX IF NOT EXISTS school_events_starts_at_idx
  ON school_events (starts_at);

CREATE INDEX IF NOT EXISTS school_events_ends_at_idx
  ON school_events (ends_at);

CREATE INDEX IF NOT EXISTS school_events_archived_at_idx
  ON school_events (archived_at);
