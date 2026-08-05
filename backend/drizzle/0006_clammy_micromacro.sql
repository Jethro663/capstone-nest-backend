ALTER TYPE "public"."notification_type" ADD VALUE 'grade_finalization_requested';--> statement-breakpoint
CREATE TABLE "transmutation_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_system_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"bands" jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "metadata" json;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "card_preset" text DEFAULT 'aurora' NOT NULL;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "is_archived" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "transmutation_tables" ADD CONSTRAINT "transmutation_tables_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transmutation_tables_is_active_idx" ON "transmutation_tables" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "transmutation_tables_updated_at_idx" ON "transmutation_tables" USING btree ("updated_at");