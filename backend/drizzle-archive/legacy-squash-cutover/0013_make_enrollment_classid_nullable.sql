-- Make class_id column nullable so we can create section-only enrollments
ALTER TABLE enrollments ALTER COLUMN class_id DROP NOT NULL;
