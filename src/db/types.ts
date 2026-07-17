import type {
  participants,
  songAppearances,
  songs,
  sourceSpreadsheets,
  weeklyEditions,
} from "@/db/schema";
import { tier } from "@/db/schema";

export type Tier = (typeof tier.enumValues)[number];

export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;

export type SourceSpreadsheet = typeof sourceSpreadsheets.$inferSelect;
export type NewSourceSpreadsheet = typeof sourceSpreadsheets.$inferInsert;

export type WeeklyEdition = typeof weeklyEditions.$inferSelect;
export type NewWeeklyEdition = typeof weeklyEditions.$inferInsert;

export type SongAppearance = typeof songAppearances.$inferSelect;
export type NewSongAppearance = typeof songAppearances.$inferInsert;
