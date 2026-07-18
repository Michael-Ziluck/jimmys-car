CREATE TABLE "app_users" (
	"id" text PRIMARY KEY NOT NULL,
	"discord_id" text NOT NULL,
	"discord_username" text NOT NULL,
	"discord_display_name" text,
	"discord_avatar" text,
	"spotify_account_id" text,
	"spotify_display_name" text,
	"spotify_image_url" text,
	"claimed_participant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_claimed_participant_id_participants_id_fk" FOREIGN KEY ("claimed_participant_id") REFERENCES "public"."participants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_discord_id_unique" ON "app_users" USING btree ("discord_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_spotify_account_id_unique" ON "app_users" USING btree ("spotify_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_claimed_participant_id_unique" ON "app_users" USING btree ("claimed_participant_id");--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_index" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_expires_at_index" ON "user_sessions" USING btree ("expires_at");