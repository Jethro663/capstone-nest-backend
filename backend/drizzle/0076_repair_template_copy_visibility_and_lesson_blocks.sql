-- Repair copied-template class content leaks and incomplete lesson copies.
-- Core assessments should not be student-visible until the teacher explicitly
-- publishes them and gives their attached module item.

UPDATE assessments AS assessment
SET is_published = false,
    updated_at = now()
WHERE assessment.is_core_template_asset = true
  AND assessment.is_published = true
  AND NOT EXISTS (
    SELECT 1
    FROM module_items AS item
    INNER JOIN module_sections AS section
      ON section.id = item.module_section_id
    INNER JOIN class_modules AS module
      ON module.id = section.module_id
    WHERE item.assessment_id = assessment.id
      AND item.item_type = 'assessment'
      AND item.is_given = true
      AND item.is_visible = true
      AND module.class_id = assessment.class_id
      AND module.is_visible = true
      AND module.is_locked = false
  );

INSERT INTO lesson_content_blocks (
  lesson_id,
  type,
  "order",
  content,
  metadata,
  created_at,
  updated_at
)
SELECT lesson.id,
       CASE
         WHEN template_block.block_type IN ('text', 'image', 'video', 'question', 'file', 'divider')
           THEN template_block.block_type::lesson_content_type
         ELSE 'text'::lesson_content_type
       END AS type,
       COALESCE(template_block."order", 1) AS "order",
       COALESCE(template_block.payload -> 'content', '""'::json) AS content,
       (
         COALESCE(template_block.payload -> 'metadata', '{}'::json)::jsonb ||
         jsonb_build_object(
           'templateBlockType', template_block.block_type,
           'templateBlockVersion', COALESCE(template_block.block_version, 1)
         )
       )::json AS metadata,
       now() AS created_at,
       now() AS updated_at
FROM lessons AS lesson
INNER JOIN class_template_lesson_blocks AS template_block
  ON template_block.template_lesson_id = lesson.template_source_id
WHERE lesson.is_core_template_asset = true
  AND lesson.template_source_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM lesson_content_blocks AS existing_block
    WHERE existing_block.lesson_id = lesson.id
  );
