import type { Participant, Song, Tier } from "@/db/types";

/** Public-friendly shape for search results and active-list views. */
export interface SongSummary {
  id: Song["id"];
  title: Song["title"];
  artistName: Song["artistName"];
  spotifyTrackId: Song["spotifyTrackId"];
  isActive: boolean;
}

/** A song's placement in a particular published weekly edition. */
export interface SongHistoryEntry {
  editionDate: string;
  tier: Tier;
  owner: Pick<Participant, "id" | "displayName">;
}

/** The eventual song-detail page model. */
export interface SongDetail extends SongSummary {
  firstAppearanceDate: string | null;
  lastAppearanceDate: string | null;
  history: SongHistoryEntry[];
}

/** Public participant profile summary. */
export interface ParticipantSummary {
  id: Participant["id"];
  displayName: Participant["displayName"];
  columnColor: Participant["columnColor"];
  activeSongCount: number;
}

/** A lightweight weekly-edition record for list and admin views. */
export interface WeeklyEditionSummary {
  id: string;
  editionDate: string;
  isCanonical: boolean;
  activeSongCount: number;
}
