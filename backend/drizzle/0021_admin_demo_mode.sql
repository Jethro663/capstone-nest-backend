CREATE TABLE "admin_demo_mode_states" (
	"id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"reason" text,
	"activated_by" uuid,
	"activated_at" timestamp with time zone,
	"deactivated_by" uuid,
	"deactivated_at" timestamp with time zone,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_demo_mode_states" ADD CONSTRAINT "admin_demo_mode_states_activated_by_users_id_fk" FOREIGN KEY ("activated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_demo_mode_states" ADD CONSTRAINT "admin_demo_mode_states_deactivated_by_users_id_fk" FOREIGN KEY ("deactivated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_demo_mode_states_expires_at_idx" ON "admin_demo_mode_states" USING btree ("expires_at");