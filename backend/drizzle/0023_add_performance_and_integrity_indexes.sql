-- Migration: 0023_add_performance_and_integrity_indexes
-- Addresses three identified gaps:
--
-- 1. Composite index on sections for the common findAll() filter pattern.
--    Queries filtering by grade_level + school_year + is_active currently do a
--    full sequential scan. This covers the dominant read path on the sections list page.
--
-- 2. Unique index on class_schedules to prevent duplicate time-slot rows per class.
--    The table has no unique constraint, so a direct DB edit or a migration edge
--    case can insert two rows with identical (class_id, start_time, end_time), which
--    renders as silent overlapping calendar blocks on the frontend.
--
-- 3. Composite index on enrollments (section_id, status) for the getRoster() query.
--    The existing partial unique index covers only (student_id, section_id) WHERE
--    class_id IS NULL; a separate composite index is needed for the status filter
--    used by every roster lookup.

-- 1. Section filter index
CREATE INDEX IF NOT EXISTS idx_sections_filter
  ON sections (grade_level, school_year, is_active);

-- 2. Class schedule uniqueness (prevents duplicate calendar slots)
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_schedules_unique_slot
  ON class_schedules (class_id, start_time, end_time);

-- 3. Enrollment roster lookup index
CREATE INDEX IF NOT EXISTS idx_enrollments_section_status
  ON enrollments (section_id, status);
