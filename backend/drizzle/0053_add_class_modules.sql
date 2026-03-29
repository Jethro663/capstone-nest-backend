DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'module_item_type'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE module_item_type AS ENUM ('lesson', 'assessment', 'file');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS class_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  "order" integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  is_locked boolean NOT NULL DEFAULT false,
  teacher_notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT class_modules_class_title_unique UNIQUE (class_id, title)
);

CREATE INDEX IF NOT EXISTS class_modules_class_id_idx
  ON class_modules(class_id);
CREATE INDEX IF NOT EXISTS class_modules_class_order_idx
  ON class_modules(class_id, "order");

CREATE TABLE IF NOT EXISTS module_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES class_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS module_sections_module_id_idx
  ON module_sections(module_id);
CREATE INDEX IF NOT EXISTS module_sections_module_order_idx
  ON module_sections(module_id, "order");

CREATE TABLE IF NOT EXISTS module_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_section_id uuid NOT NULL REFERENCES module_sections(id) ON DELETE CASCADE,
  item_type module_item_type NOT NULL,
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
  file_id uuid,
  "order" integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  is_required boolean NOT NULL DEFAULT false,
  metadata json,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT module_items_lesson_id_unique UNIQUE (lesson_id),
  CONSTRAINT module_items_assessment_id_unique UNIQUE (assessment_id),
  CONSTRAINT module_items_file_id_unique UNIQUE (file_id)
);

CREATE INDEX IF NOT EXISTS module_items_section_id_idx
  ON module_items(module_section_id);
CREATE INDEX IF NOT EXISTS module_items_section_order_idx
  ON module_items(module_section_id, "order");
CREATE INDEX IF NOT EXISTS module_items_lesson_id_idx
  ON module_items(lesson_id);
CREATE INDEX IF NOT EXISTS module_items_assessment_id_idx
  ON module_items(assessment_id);
CREATE INDEX IF NOT EXISTS module_items_file_id_idx
  ON module_items(file_id);

CREATE TABLE IF NOT EXISTS module_grading_scale_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES class_modules(id) ON DELETE CASCADE,
  letter varchar(8) NOT NULL,
  label text NOT NULL,
  min_score integer NOT NULL,
  max_score integer NOT NULL,
  description text,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS module_grading_scale_entries_module_id_idx
  ON module_grading_scale_entries(module_id);
CREATE INDEX IF NOT EXISTS module_grading_scale_entries_module_order_idx
  ON module_grading_scale_entries(module_id, "order");

-- Legacy lesson migration (idempotent):
-- 1) create Module 1 for each class with lessons and without modules
-- 2) create Section 1 for modules without sections
-- 3) attach lessons in order into the default section
WITH classes_with_lessons AS (
  SELECT DISTINCT l.class_id
  FROM lessons l
),
created_modules AS (
  INSERT INTO class_modules (class_id, title, description, "order", is_visible, is_locked, teacher_notes)
  SELECT cwl.class_id,
         'Module 1',
         'Auto-generated during module migration',
         1,
         true,
         false,
         NULL
  FROM classes_with_lessons cwl
  WHERE NOT EXISTS (
    SELECT 1
    FROM class_modules cm
    WHERE cm.class_id = cwl.class_id
  )
  RETURNING id
)
SELECT COUNT(*) FROM created_modules;

INSERT INTO module_sections (module_id, title, description, "order")
SELECT cm.id,
       'Section 1',
       'Auto-generated during module migration',
       1
FROM class_modules cm
WHERE EXISTS (
  SELECT 1
  FROM lessons l
  WHERE l.class_id = cm.class_id
)
AND NOT EXISTS (
  SELECT 1
  FROM module_sections ms
  WHERE ms.module_id = cm.id
);

INSERT INTO module_items (
  module_section_id,
  item_type,
  lesson_id,
  "order",
  is_visible,
  is_required,
  metadata
)
SELECT default_section.id,
       'lesson'::module_item_type,
       l.id,
       CASE
         WHEN COALESCE(l."order", 0) > 0 THEN l."order"
         ELSE ROW_NUMBER() OVER (PARTITION BY l.class_id ORDER BY l.created_at, l.id)
       END,
       true,
       false,
       '{}'::json
FROM lessons l
JOIN class_modules cm
  ON cm.class_id = l.class_id
JOIN LATERAL (
  SELECT ms.id
  FROM module_sections ms
  WHERE ms.module_id = cm.id
  ORDER BY ms."order", ms.created_at
  LIMIT 1
) AS default_section ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM module_items mi
  WHERE mi.lesson_id = l.id
);
