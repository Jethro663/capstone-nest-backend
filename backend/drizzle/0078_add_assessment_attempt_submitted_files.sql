ALTER TABLE "assessment_attempts"
ADD COLUMN "submitted_files" json;

UPDATE "assessment_attempts"
SET "submitted_files" = CASE
  WHEN "submitted_file_id" IS NOT NULL THEN json_build_array(
    json_build_object(
      'id', "submitted_file_id",
      'originalName', "submitted_file_original_name",
      'mimeType', "submitted_file_mime_type",
      'sizeBytes', "submitted_file_size_bytes",
      'uploadedAt', COALESCE("updated_at", "created_at")
    )
  )
  ELSE '[]'::json
END;
