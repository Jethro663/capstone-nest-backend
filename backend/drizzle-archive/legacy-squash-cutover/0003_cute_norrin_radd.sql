CREATE TYPE "public"."otp_purpose" AS ENUM('email_verification', 'password_reset', 'login_2fa');--> statement-breakpoint
CREATE TABLE "otp_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"purpose" "otp_purpose" DEFAULT 'email_verification' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "otp_verifications_user_id_idx" ON "otp_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "otp_verifications_expires_at_idx" ON "otp_verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "otp_verifications_purpose_idx" ON "otp_verifications" USING btree ("purpose");--> statement-breakpoint
CREATE INDEX "otp_verifications_is_used_idx" ON "otp_verifications" USING btree ("is_used");