CREATE TYPE "public"."tier" AS ENUM('S', 'A', 'B', 'C', 'D', 'F');--> statement-breakpoint
CREATE TABLE "participants" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"discord_user_id" text,
	"column_color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "song_appearances" (
	"weekly_edition_id" text NOT NULL,
	"song_id" text NOT NULL,
	"participant_id" text NOT NULL,
	"tier" "tier" NOT NULL,
	"source_row_index" integer NOT NULL,
	"source_column_index" integer NOT NULL,
	CONSTRAINT "song_appearances_primary_key" PRIMARY KEY("weekly_edition_id","song_id","participant_id","source_row_index","source_column_index")
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"normalized_title" text NOT NULL,
	"artist_name" text,
	"spotify_track_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_spreadsheets" (
	"google_spreadsheet_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"source_priority" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_editions" (
	"id" text PRIMARY KEY NOT NULL,
	"source_spreadsheet_id" text NOT NULL,
	"source_tab_name" text NOT NULL,
	"source_tab_index" integer NOT NULL,
	"edition_date" date NOT NULL,
	"is_canonical" boolean DEFAULT false NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "song_appearances" ADD CONSTRAINT "song_appearances_weekly_edition_id_weekly_editions_id_fk" FOREIGN KEY ("weekly_edition_id") REFERENCES "public"."weekly_editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_appearances" ADD CONSTRAINT "song_appearances_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_appearances" ADD CONSTRAINT "song_appearances_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_editions" ADD CONSTRAINT "weekly_editions_source_spreadsheet_id_source_spreadsheets_google_spreadsheet_id_fk" FOREIGN KEY ("source_spreadsheet_id") REFERENCES "public"."source_spreadsheets"("google_spreadsheet_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "participants_normalized_name_unique" ON "participants" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "song_appearances_song_edition_index" ON "song_appearances" USING btree ("song_id","weekly_edition_id");--> statement-breakpoint
CREATE INDEX "song_appearances_participant_edition_index" ON "song_appearances" USING btree ("participant_id","weekly_edition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "songs_normalized_title_unique" ON "songs" USING btree ("normalized_title");--> statement-breakpoint
CREATE UNIQUE INDEX "songs_spotify_track_id_unique" ON "songs" USING btree ("spotify_track_id");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_editions_source_tab_unique" ON "weekly_editions" USING btree ("source_spreadsheet_id","source_tab_name");--> statement-breakpoint
CREATE INDEX "weekly_editions_edition_date_index" ON "weekly_editions" USING btree ("edition_date");