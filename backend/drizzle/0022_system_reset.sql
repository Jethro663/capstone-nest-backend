CREATE TABLE "system_reset_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_email" text NOT NULL,
	"environment" text NOT NULL,
	"school_year" text NOT NULL,
	"period" text NOT NULL,
	"reason" text NOT NULL,
	"request_hash" text NOT NULL,
	"phase" text DEFAULT 'draining' NOT NULL,
	"manifest" jsonb NOT NULL,
	"checkpoint" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"failure" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "system_reset_operations_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "system_reset_state" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"operation_id" uuid,
	"epoch" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;