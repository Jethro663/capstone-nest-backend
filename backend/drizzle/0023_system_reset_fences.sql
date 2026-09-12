CREATE TABLE "system_reset_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"source_table" text NOT NULL,
	"source_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_reset_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"cache_epoch" integer DEFAULT -1 NOT NULL,
	"heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "system_reset_evidence" ADD CONSTRAINT "system_reset_evidence_operation_id_system_reset_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."system_reset_operations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
INSERT INTO public.system_reset_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.nexora_reset_write_barrier() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE reset_active boolean; reset_operation uuid; reset_epoch integer; request_epoch text;
BEGIN
  -- Shared transaction lock covers HTTP handlers, scheduled jobs, BullMQ and
  -- direct AI writers, including statements that affect zero rows.
  PERFORM pg_advisory_xact_lock_shared(78766903);
  -- A row lock makes a stale REPEATABLE READ snapshot fail serialization instead
  -- of seeing an old inactive flag after the coordinator has advanced the state.
  SELECT active, operation_id, epoch INTO reset_active, reset_operation, reset_epoch
    FROM public.system_reset_state WHERE id = 1 FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'System reset state is unavailable' USING ERRCODE = '55000';
  END IF;
  IF reset_active AND reset_operation IS NOT NULL AND
    current_setting('nexora.system_reset', true) = reset_operation::text THEN
    RETURN NULL;
  END IF;
  request_epoch := NULLIF(current_setting('nexora.reset_epoch', true), '');
  -- AI request sessions carry their admission epoch on every transaction. This
  -- also fences late writes after maintenance ends or a control lease is lost.
  IF reset_active OR (request_epoch IS NOT NULL AND request_epoch IS DISTINCT FROM reset_epoch::text) THEN
    RAISE EXCEPTION 'School data reset maintenance is active' USING ERRCODE = '55000';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
DO $$
DECLARE target record;
BEGIN
  FOR target IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r'
      AND c.relname NOT IN ('_applied_migrations','system_reset_state','system_reset_operations','system_reset_instances')
  LOOP
    EXECUTE format('CREATE TRIGGER nexora_reset_write_barrier BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.nexora_reset_write_barrier()', target.relname);
  END LOOP;
END;
$$;
