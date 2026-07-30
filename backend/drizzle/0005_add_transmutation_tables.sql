CREATE TABLE IF NOT EXISTS "transmutation_tables" (
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

DO $$ BEGIN
 ALTER TABLE "transmutation_tables" ADD CONSTRAINT "transmutation_tables_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "transmutation_tables_is_active_idx" ON "transmutation_tables" ("is_active");
CREATE INDEX IF NOT EXISTS "transmutation_tables_updated_at_idx" ON "transmutation_tables" ("updated_at");
