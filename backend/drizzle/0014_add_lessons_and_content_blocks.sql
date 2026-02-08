-- Create lessonContentType enum
CREATE TYPE "lesson_content_type" AS ENUM('text', 'image', 'video', 'question', 'file', 'divider');

-- Drop old lessons table if it exists
DROP TABLE IF EXISTS "lessons" CASCADE;

-- Create lessons table with new structure
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"class_id" uuid NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"is_draft" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE cascade
);

-- Create lesson content blocks table
CREATE TABLE "lesson_content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"type" "lesson_content_type" NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"content" json NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_content_blocks_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE cascade
);

-- Create indexes
CREATE INDEX "lessons_class_id_idx" ON "lessons" ("class_id");
CREATE INDEX "lessons_class_order_idx" ON "lessons" ("class_id", "order");
CREATE INDEX "lesson_content_blocks_lesson_id_idx" ON "lesson_content_blocks" ("lesson_id");
CREATE INDEX "lesson_content_blocks_lesson_order_idx" ON "lesson_content_blocks" ("lesson_id", "order");
