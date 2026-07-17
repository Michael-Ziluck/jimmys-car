CREATE TABLE "spotify_link_suggestions" (
	"id" text PRIMARY KEY NOT NULL,
	"song_id" text NOT NULL,
	"spotify_track_id" text NOT NULL,
	"submitted_value" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spotify_link_suggestions" ADD CONSTRAINT "spotify_link_suggestions_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "spotify_link_suggestions_song_track_unique" ON "spotify_link_suggestions" USING btree ("song_id","spotify_track_id");--> statement-breakpoint
CREATE INDEX "spotify_link_suggestions_status_index" ON "spotify_link_suggestions" USING btree ("status");