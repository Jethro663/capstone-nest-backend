CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "user_agent" text,
  "ip" text,
  "revoked" boolean NOT NULL DEFAULT false,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "refresh_tokens_token_hash_idx" ON "refresh_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "refresh_tokens_revoked_idx" ON "refresh_tokens" ("revoked");
CREATE INDEX IF NOT EXISTS "refresh_tokens_expires_at_idx" ON "refresh_tokens" ("expires_at");
