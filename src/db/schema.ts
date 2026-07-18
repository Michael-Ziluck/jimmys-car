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

// eslint-disable-next-line @typescript-eslint/typedef -- Drizzle infers the enum tuple from these values.
export const tier = pgEnum("tier", ["S", "A", "B", "C", "D", "F"]);

// eslint-disable-next-line @typescript-eslint/typedef -- Preserve Drizzle's inferred column map.
export const sourceSpreadsheets = pgTable("source_spreadsheets", {
  googleSpreadsheetId: text("google_spreadsheet_id").primaryKey(),
  title: text("title").notNull(),
  sourcePriority: integer("source_priority").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// eslint-disable-next-line @typescript-eslint/typedef -- Preserve Drizzle's inferred column map.
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

/** A person authenticated through Discord, with optional linked services. */
// eslint-disable-next-line @typescript-eslint/typedef -- Preserve Drizzle's inferred column map.
export const appUsers = pgTable(
  "app_users",
  {
    id: text("id").primaryKey(),
    discordId: text("discord_id").notNull(),
    discordUsername: text("discord_username").notNull(),
    discordDisplayName: text("discord_display_name"),
    discordAvatar: text("discord_avatar"),
    spotifyAccountId: text("spotify_account_id"),
    spotifyDisplayName: text("spotify_display_name"),
    spotifyImageUrl: text("spotify_image_url"),
    claimedParticipantId: text("claimed_participant_id").references(() => participants.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("app_users_discord_id_unique").on(table.discordId),
    uniqueIndex("app_users_spotify_account_id_unique").on(table.spotifyAccountId),
    uniqueIndex("app_users_claimed_participant_id_unique").on(table.claimedParticipantId),
  ],
);

/** Opaque, short-lived browser sessions. Never put provider tokens in the browser. */
// eslint-disable-next-line @typescript-eslint/typedef -- Preserve Drizzle's inferred column map.
export const userSessions = pgTable(
  "user_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("user_sessions_user_id_index").on(table.userId), index("user_sessions_expires_at_index").on(table.expiresAt)],
);

/** Historical records initially identify songs by title only. */
// eslint-disable-next-line @typescript-eslint/typedef -- Preserve Drizzle's inferred column map.
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
// eslint-disable-next-line @typescript-eslint/typedef -- Preserve Drizzle's inferred column map.
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
// eslint-disable-next-line @typescript-eslint/typedef -- Preserve Drizzle's inferred column map.
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
// eslint-disable-next-line @typescript-eslint/typedef -- Preserve Drizzle's inferred column map.
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
