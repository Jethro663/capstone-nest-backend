CREATE TABLE "admin_erasure_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"target_snapshot" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"impact_counts" jsonb NOT NULL,
	"storage_objects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"result" jsonb,
	"failure_code" text,
	"failure_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_erasure_item_operation_target_unique" UNIQUE("operation_id","target_id"),
	CONSTRAINT "admin_erasure_item_status_valid" CHECK ("admin_erasure_items"."status" IN ('pending','deleted','cleanup_pending','completed','cleanup_failed'))
);
--> statement-breakpoint
CREATE TABLE "admin_erasure_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"target_type" text NOT NULL,
	"purge_mode" text NOT NULL,
	"actor_id" uuid,
	"actor_snapshot" jsonb NOT NULL,
	"status" text DEFAULT 'executing' NOT NULL,
	"request_hash" text NOT NULL,
	"manifest_hash" text NOT NULL,
	"database_schema_hash" text NOT NULL,
	"catalog_version" integer NOT NULL,
	"reason_code" text NOT NULL,
	"notes" text NOT NULL,
	"target_count" integer NOT NULL,
	"impact_summary" jsonb NOT NULL,
	"cleanup_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"failure_code" text,
	"failure_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "admin_erasure_operations_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "admin_erasure_operation_target_type_valid" CHECK ("admin_erasure_operations"."target_type" IN ('CLASS','SECTION','USER')),
	CONSTRAINT "admin_erasure_operation_purge_mode_valid" CHECK ("admin_erasure_operations"."purge_mode" IN ('EMPTY_ONLY','CASCADE_ERASE')),
	CONSTRAINT "admin_erasure_operation_status_valid" CHECK ("admin_erasure_operations"."status" IN ('executing','cleanup_pending','completed','completed_with_cleanup_errors','failed')),
	CONSTRAINT "admin_erasure_operation_target_count_valid" CHECK ("admin_erasure_operations"."target_count" BETWEEN 1 AND 50)
);
--> statement-breakpoint
ALTER TABLE "admin_erasure_items" ADD CONSTRAINT "admin_erasure_items_operation_id_admin_erasure_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."admin_erasure_operations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_erasure_operations" ADD CONSTRAINT "admin_erasure_operations_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_erasure_item_operation_idx" ON "admin_erasure_items" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "admin_erasure_item_target_idx" ON "admin_erasure_items" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "admin_erasure_item_status_idx" ON "admin_erasure_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_erasure_operation_actor_idx" ON "admin_erasure_operations" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "admin_erasure_operation_status_idx" ON "admin_erasure_operations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_erasure_operation_created_at_idx" ON "admin_erasure_operations" USING btree ("created_at");--> statement-breakpoint
CREATE TRIGGER nexora_reset_write_barrier BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.admin_erasure_operations FOR EACH STATEMENT EXECUTE FUNCTION public.nexora_reset_write_barrier();--> statement-breakpoint
CREATE TRIGGER nexora_reset_write_barrier BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.admin_erasure_items FOR EACH STATEMENT EXECUTE FUNCTION public.nexora_reset_write_barrier();
