CREATE TABLE "admin_maintenance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_session_version" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"scope_codes" jsonb NOT NULL,
	"reason" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_maintenance_session_status_valid" CHECK ("admin_maintenance_sessions"."status" IN ('ACTIVE','CLOSED','EXPIRED','REVOKED')),
	CONSTRAINT "admin_maintenance_session_expiry_valid" CHECK ("admin_maintenance_sessions"."expires_at" > "admin_maintenance_sessions"."started_at")
);
--> statement-breakpoint
ALTER TABLE "admin_maintenance_sessions" ADD CONSTRAINT "admin_maintenance_sessions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_maintenance_session_actor_active_unique" ON "admin_maintenance_sessions" USING btree ("actor_user_id") WHERE "admin_maintenance_sessions"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "admin_maintenance_session_actor_idx" ON "admin_maintenance_sessions" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "admin_maintenance_session_expiry_idx" ON "admin_maintenance_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "admin_maintenance_session_status_idx" ON "admin_maintenance_sessions" USING btree ("status");--> statement-breakpoint
UPDATE "admin_demo_mode_states"
SET "enabled" = false,
	"expires_at" = NULL,
	"reason" = 'Retired by Admin Maintenance Gateway migration',
	"deactivated_at" = now(),
	"version" = "version" + 1,
	"updated_at" = now()
WHERE "enabled" = true;--> statement-breakpoint
ALTER TABLE "admin_lifecycle_operations" DROP CONSTRAINT "admin_lifecycle_operation_action_valid";--> statement-breakpoint
ALTER TABLE "admin_lifecycle_operations" ADD CONSTRAINT "admin_lifecycle_operation_action_valid" CHECK ("admin_lifecycle_operations"."action" IN ('STUDENT_RESOLUTION','ARCHIVE_CLASS','ARCHIVE_SECTION','PURGE_CLASS','PURGE_SECTION','PURGE_USER'));--> statement-breakpoint
CREATE TRIGGER nexora_reset_write_barrier BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.admin_maintenance_sessions FOR EACH STATEMENT EXECUTE FUNCTION public.nexora_reset_write_barrier();
