-- Migrate subject data from `subjects` table into `classes` and drop `subjects`
BEGIN;

-- 1) Add new columns to classes
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS subject_name text;
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS subject_code text;
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS subject_grade_level text;

-- 2) Copy values from subjects into classes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'subjects') THEN
    UPDATE classes
    SET subject_name = s.name,
        subject_code = s.code,
        subject_grade_level = s.grade_level
    FROM subjects s
    WHERE classes.subject_id = s.id;
  END IF;
END$$;

-- 3) Normalize subject_code (uppercase) where present
UPDATE classes SET subject_code = UPPER(subject_code) WHERE subject_code IS NOT NULL;

-- 4) Ensure subject_name and subject_code are not NULL for existing rows
ALTER TABLE IF EXISTS classes ALTER COLUMN subject_name SET NOT NULL;
ALTER TABLE IF EXISTS classes ALTER COLUMN subject_code SET NOT NULL;

-- 5) Add indexes and unique constraint to enforce uniqueness
CREATE INDEX IF NOT EXISTS classes_subject_code_idx ON classes (subject_code);
CREATE INDEX IF NOT EXISTS classes_subject_name_idx ON classes (subject_name);
-- Unique index across subject_code, section_id, school_year
CREATE UNIQUE INDEX IF NOT EXISTS classes_subject_section_schoolyear_uniq ON classes (subject_code, section_id, school_year);

-- 6) Drop foreign key referencing subjects and remove subject_id column (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name='classes' AND column_name='subject_id'
  ) THEN
    -- Drop any FK constraint on subject_id
    PERFORM (
      SELECT 'ALTER TABLE classes DROP CONSTRAINT ' || quote_ident(con.conname) || ';'
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'classes' AND con.conkey IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM unnest(con.conkey) WITH ORDINALITY as cols(col, ord) JOIN pg_attribute a ON a.attnum = cols.col AND a.attrelid = rel.oid WHERE a.attname = 'subject_id'
        )
      LIMIT 1
    ) INTO STRICT;
    -- Finally drop the column
    ALTER TABLE classes DROP COLUMN IF EXISTS subject_id;
  END IF;
END$$;

-- 7) Drop the subjects table (optional, only if it exists)
DROP TABLE IF EXISTS subjects CASCADE;

COMMIT;
