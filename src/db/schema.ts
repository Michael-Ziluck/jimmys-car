import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const tier = pgEnum("tier", ["S", "A", "B", "C", "D", "F"]);

export const sourceSpreadsheets = pgTable("source_spreadsheets", {
  googleSpreadsheetId: text("google_spreadsheet_id").primaryKey(),
  title: text("title").notNull(),
  sourcePriority: integer("source_priority").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const participants = pgTable(
  "participants",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    discordUserId: text("discord_user_id"),
    columnColor: text("column_color"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("participants_normalized_name_unique").on(table.normalizedName)],
);

/** Historical records initially identify songs by title only. */
export const songs = pgTable(
  "songs",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull(),
    artistName: text("artist_name"),
    spotifyTrackId: text("spotify_track_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("songs_normalized_title_unique").on(table.normalizedTitle),
    uniqueIndex("songs_spotify_track_id_unique").on(table.spotifyTrackId),
  ],
);

/** User-submitted Spotify matches awaiting human review. */
export const spotifyLinkSuggestions = pgTable(
  "spotify_link_suggestions",
  {
    id: text("id").primaryKey(),
    songId: text("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
    spotifyTrackId: text("spotify_track_id").notNull(),
    submittedValue: text("submitted_value").notNull(),
    status: text("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("spotify_link_suggestions_song_track_unique").on(
      table.songId,
      table.spotifyTrackId,
    ),
    index("spotify_link_suggestions_status_index").on(table.status),
  ],
);

/** A dated worksheet snapshot; overlapping sources are retained. */
export const weeklyEditions = pgTable(
  "weekly_editions",
  {
    id: text("id").primaryKey(),
    sourceSpreadsheetId: text("source_spreadsheet_id")
      .notNull()
      .references(() => sourceSpreadsheets.googleSpreadsheetId, { onDelete: "cascade" }),
    sourceTabName: text("source_tab_name").notNull(),
    sourceTabIndex: integer("source_tab_index").notNull(),
    editionDate: date("edition_date", { mode: "string" }).notNull(),
    isCanonical: boolean("is_canonical").default(false).notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("weekly_editions_source_tab_unique").on(
      table.sourceSpreadsheetId,
      table.sourceTabName,
    ),
    index("weekly_editions_edition_date_index").on(table.editionDate),
  ],
);

/** A song's owner and tier placement in one weekly snapshot. */
export const songAppearances = pgTable(
  "song_appearances",
  {
    weeklyEditionId: text("weekly_edition_id")
      .notNull()
      .references(() => weeklyEditions.id, { onDelete: "cascade" }),
    songId: text("song_id").notNull().references(() => songs.id, { onDelete: "restrict" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "restrict" }),
    tier: tier("tier").notNull(),
    sourceRowIndex: integer("source_row_index").notNull(),
    sourceColumnIndex: integer("source_column_index").notNull(),
  },
  (table) => [
    primaryKey({
      name: "song_appearances_primary_key",
      columns: [
        table.weeklyEditionId,
        table.songId,
        table.participantId,
        table.sourceRowIndex,
        table.sourceColumnIndex,
      ],
    }),
    index("song_appearances_song_edition_index").on(table.songId, table.weeklyEditionId),
    index("song_appearances_participant_edition_index").on(
      table.participantId,
      table.weeklyEditionId,
    ),
  ],
);
