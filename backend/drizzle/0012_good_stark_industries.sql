CREATE TYPE "public"."lesson_content_type" AS ENUM('text', 'image', 'video', 'question', 'file', 'divider');--> statement-breakpoint
CREATE TABLE "lesson_content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"type" "lesson_content_type" NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"content" json NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lessons" RENAME COLUMN "content_type" TO "order";--> statement-breakpoint
ALTER TABLE "lessons" RENAME COLUMN "content_url" TO "is_draft";--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_content_blocks" ADD CONSTRAINT "lesson_content_blocks_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lesson_content_blocks_lesson_id_idx" ON "lesson_content_blocks" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_content_blocks_lesson_order_idx" ON "lesson_content_blocks" USING btree ("lesson_id","order");--> statement-breakpoint
CREATE INDEX "lessons_class_id_idx" ON "lessons" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "lessons_class_order_idx" ON "lessons" USING btree ("class_id","order");