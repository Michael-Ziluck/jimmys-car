import type { Tier } from "./database";
import type { SpotifyTrack } from "./spotify";

export interface HistoricalImportAppearance {
  songTitle: string;
  participantName: string;
  tier: Tier;
  sourceRowIndex: number;
  sourceColumnIndex: number;
}

export interface HistoricalImportEdition {
  id: string;
  sourceSpreadsheetId: string;
  sourceTabName: string;
  sourceTabIndex: number;
  editionDate: string;
  isCanonical: boolean;
  appearances: HistoricalImportAppearance[];
  scores: ImportedScoreEntry[];
}

export interface ImportedScoreEntry {
  name: string;
  points: number;
  change: number;
  songs: number;
  average: number;
  rank: number;
}

export interface ImportedSpotifyTrack {
  id: string;
  name: string;
  artistName: string;
}

export interface ParticipantColumn {
  name: string;
  index: number;
}

export interface ParticipantHeaderColumn {
  value: string;
  index: number;
}

export interface SpotifyPlaylistItem {
  id?: string;
  name?: string;
  artists?: Array<{ name: string }>;
}

export interface SpotifyPlaylistPage {
  items: Array<{
    item?: SpotifyPlaylistItem;
    track?: SpotifyPlaylistItem;
  }>;
  next: string | null;
}

export interface DiscordDatabaseSong {
  id: string;
  title: string;
  normalized_title: string;
  spotify_track_id: string | null;
}

export interface DiscordSongMatch {
  song: DiscordDatabaseSong;
  track: SpotifyTrack;
}

export interface DiscordSongUpdate {
  id: string;
  spotify_track_id: string;
  artist_name: string | null;
}

export interface DatabaseConnectionIdentity {
  database: string;
  user: string;
}

export interface HistoricalSheetSource {
  id: string;
  title: string;
  latestEditionDate: string;
  latestExpectedTierCounts?: Record<Tier, number>;
  priority: 1 | 2 | 3 | 4;
  latestSheetGid?: string;
}
