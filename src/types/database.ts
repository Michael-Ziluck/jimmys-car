import type {
  appSettings,
  appUsers,
  participants,
  songAppearances,
  songs,
  sourceSpreadsheets,
  spotifyLinkSuggestions,
  tier,
  userSessions,
  weeklyEditions,
} from "@/db/schema";

export type Tier = (typeof tier.enumValues)[number];

export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;

export type AppUser = typeof appUsers.$inferSelect;
export type NewAppUser = typeof appUsers.$inferInsert;

export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;

export type SpotifyLinkSuggestion = typeof spotifyLinkSuggestions.$inferSelect;
export type NewSpotifyLinkSuggestion =
  typeof spotifyLinkSuggestions.$inferInsert;

export type SourceSpreadsheet = typeof sourceSpreadsheets.$inferSelect;
export type NewSourceSpreadsheet = typeof sourceSpreadsheets.$inferInsert;

export type WeeklyEdition = typeof weeklyEditions.$inferSelect;
export type NewWeeklyEdition = typeof weeklyEditions.$inferInsert;

export type SongAppearance = typeof songAppearances.$inferSelect;
export type NewSongAppearance = typeof songAppearances.$inferInsert;
