CREATE TABLE "archived_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"archived_data" json NOT NULL,
	"archived_by" uuid NOT NULL,
	"archived_at" timestamp DEFAULT now() NOT NULL,
	"purged_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "archived_users_original_user_id_idx" ON "archived_users" USING btree ("original_user_id");--> statement-breakpoint
CREATE INDEX "archived_users_email_idx" ON "archived_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "archived_users_archived_at_idx" ON "archived_users" USING btree ("archived_at");