CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"date_of_birth" timestamp,
	"gender" text,
	"civil_status" text,
	"course" text,
	"phone" text,
	"city" text,
	"country" text,
	"family_name" text,
	"family_relationship" text,
	"family_contact" text,
	"profile_picture" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_profiles_user_id_idx" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "date_of_birth";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "gender";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "civil_status";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "course";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "country";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "family_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "family_relationship";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "family_contact";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "profile_picture";