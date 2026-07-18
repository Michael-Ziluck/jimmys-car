CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "spotify_account_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "participants_spotify_account_id_unique" ON "participants" USING btree ("spotify_account_id");
--> statement-breakpoint
UPDATE "app_users" SET "role" = 'admin' WHERE "id" = (SELECT "id" FROM "app_users" ORDER BY "created_at" ASC LIMIT 1);
--> statement-breakpoint
INSERT INTO "app_settings" ("key", "value") VALUES
  ('spreadsheet_url', 'https://docs.google.com/spreadsheets/d/1twFFgFkUlMmHNAQ2FCKvbmIOy8xilINlV6Pk4HRhkS8/edit'),
  ('playlist_url', 'https://open.spotify.com/playlist/5b4hdpNWm9Nu1Y5i7w5eKY');
