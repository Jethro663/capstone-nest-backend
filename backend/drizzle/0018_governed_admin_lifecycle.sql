CREATE TABLE "admin_lifecycle_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"status" text DEFAULT 'executing' NOT NULL,
	"actor_id" uuid,
	"actor_snapshot" jsonb NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"manifest_hash" text NOT NULL,
	"reason_code" text NOT NULL,
	"notes" text NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"result" jsonb,
	"failure" text,
	"audit_log_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "admin_lifecycle_operations_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "admin_lifecycle_operation_action_valid" CHECK ("admin_lifecycle_operations"."action" IN ('STUDENT_RESOLUTION','ARCHIVE_CLASS','ARCHIVE_SECTION','PURGE_CLASS','PURGE_SECTION')),
	CONSTRAINT "admin_lifecycle_operation_status_valid" CHECK ("admin_lifecycle_operations"."status" IN ('executing','completed','failed')),
	CONSTRAINT "admin_lifecycle_operation_attempt_count_valid" CHECK ("admin_lifecycle_operations"."attempt_count" >= 1)
);
--> statement-breakpoint
CREATE TABLE "enrollment_lifecycle_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"student_id" uuid,
	"student_snapshot" jsonb NOT NULL,
	"class_id" uuid,
	"section_id" uuid,
	"destination_class_id" uuid,
	"destination_section_id" uuid,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"outcome" text NOT NULL,
	"effective_period" "grading_period" NOT NULL,
	"reason_code" text NOT NULL,
	"notes" text NOT NULL,
	"actor_id" uuid,
	"actor_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollment_lifecycle_event_operation_enrollment_unique" UNIQUE("operation_id","enrollment_id"),
	CONSTRAINT "enrollment_lifecycle_event_status_valid" CHECK ("enrollment_lifecycle_events"."from_status" IN ('enrolled','dropped','completed') AND "enrollment_lifecycle_events"."to_status" IN ('enrolled','dropped','completed')),
	CONSTRAINT "enrollment_lifecycle_event_outcome_valid" CHECK ("enrollment_lifecycle_events"."outcome" IN ('corrected','withdrawn','transferred_section','transferred_class','completed','archived'))
);
--> statement-breakpoint
DO $$
DECLARE
	"actor_fk_name" text;
BEGIN
	SELECT "constraint"."conname"
	INTO "actor_fk_name"
	FROM "pg_constraint" AS "constraint"
	WHERE "constraint"."conrelid" = 'public.audit_logs'::regclass
		AND "constraint"."confrelid" = 'public.users'::regclass
		AND "constraint"."contype" = 'f'
		AND "constraint"."conkey" = ARRAY[
			(
				SELECT "attribute"."attnum"
				FROM "pg_attribute" AS "attribute"
				WHERE "attribute"."attrelid" = 'public.audit_logs'::regclass
					AND "attribute"."attname" = 'actor_id'
			)
		]::smallint[]
	LIMIT 1;

	IF "actor_fk_name" IS NOT NULL THEN
		EXECUTE format(
			'ALTER TABLE public.audit_logs DROP CONSTRAINT %I',
			"actor_fk_name"
		);
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "actor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_lifecycle_operations" ADD CONSTRAINT "admin_lifecycle_operations_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_lifecycle_events" ADD CONSTRAINT "enrollment_lifecycle_events_operation_id_admin_lifecycle_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."admin_lifecycle_operations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_lifecycle_events" ADD CONSTRAINT "enrollment_lifecycle_events_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_lifecycle_events" ADD CONSTRAINT "enrollment_lifecycle_events_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_lifecycle_events" ADD CONSTRAINT "enrollment_lifecycle_events_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_lifecycle_events" ADD CONSTRAINT "enrollment_lifecycle_events_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_lifecycle_events" ADD CONSTRAINT "enrollment_lifecycle_events_destination_class_id_classes_id_fk" FOREIGN KEY ("destination_class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_lifecycle_events" ADD CONSTRAINT "enrollment_lifecycle_events_destination_section_id_sections_id_fk" FOREIGN KEY ("destination_section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_lifecycle_events" ADD CONSTRAINT "enrollment_lifecycle_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_lifecycle_operation_actor_idx" ON "admin_lifecycle_operations" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "admin_lifecycle_operation_target_idx" ON "admin_lifecycle_operations" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "admin_lifecycle_operation_status_idx" ON "admin_lifecycle_operations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_lifecycle_operation_created_at_idx" ON "admin_lifecycle_operations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "enrollment_lifecycle_event_operation_idx" ON "enrollment_lifecycle_events" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "enrollment_lifecycle_event_student_idx" ON "enrollment_lifecycle_events" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrollment_lifecycle_event_class_idx" ON "enrollment_lifecycle_events" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "enrollment_lifecycle_event_section_idx" ON "enrollment_lifecycle_events" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "enrollment_lifecycle_event_created_at_idx" ON "enrollment_lifecycle_events" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
