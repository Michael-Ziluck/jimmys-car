import type { ReactNode } from "react";

import type { Participant, Song, Tier } from "./database";
import type { ParticipantIdentity } from "./participants";

export type SongView = "cards" | "list";
export type SongScope = "current" | "history";
export type SongSearchField = "song" | "artist";
export type SongSortField = "song" | "artist" | "time";

export interface SongSummary {
  id: Song["id"];
  title: Song["title"];
  artistName: Song["artistName"];
  spotifyTrackId: Song["spotifyTrackId"];
  isActive: boolean;
}

export interface SongHistoryEntry {
  editionDate: string;
  tier: Tier;
  owner: Pick<Participant, "id" | "displayName">;
}

export interface SongTierStint {
  enteredAt: string;
  lastRatedAt: string;
  leftAt: string | null;
  editionCount: number;
}

export interface SongDetail extends SongSummary {
  firstAppearanceDate: string | null;
  lastAppearanceDate: string | null;
  appearanceCount: number;
  isActive: boolean;
  history: SongHistoryEntry[];
  stints: SongTierStint[];
}

export interface SongDetailResult {
  song: SongDetail;
  isAdmin: boolean;
  owners: ParticipantIdentity[];
}

export interface DisplaySong {
  id: Song["id"];
  title: Song["title"];
  artistName: Song["artistName"];
  spotifyTrackId: Song["spotifyTrackId"];
  pendingSpotifyTrackId: string | null;
  tier: Tier | null;
  ownerId: Participant["id"] | null;
  owner: Participant["displayName"] | null;
  lastAppearanceDate: string | null;
}

export interface SongSearchResult {
  songs: DisplaySong[];
  isAdmin: boolean;
  owners: ParticipantIdentity[];
}

export interface SongFilterResult {
  songs: DisplaySong[] | null;
  error: string | null;
}

export interface LegacySongResult {
  id: string;
  title: string;
  artistName: string | null;
  spotifyTrackId: string | null;
  tier: Tier | null;
  owner: string | null;
}

export interface SongHistoryPageData {
  songs: DisplaySong[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

export interface SongHistoryResult extends SongHistoryPageData {
  isAdmin: boolean;
  owners: ParticipantIdentity[];
}

export interface SongBrowserPageProps {
  scope: SongScope;
  songs: DisplaySong[] | null;
  isAdmin: boolean;
  owners: ParticipantIdentity[];
  query: string;
  onQueryChange: (query: string) => void;
  countLabel: string | null;
  error: string | null;
  onRetry: () => void;
  onSearch?: () => void;
  advancedSearch: boolean;
  onAdvancedSearchChange: (advanced: boolean) => void;
  searchField: SongSearchField;
  onSearchFieldChange: (field: SongSearchField) => void;
  sortField: SongSortField;
  onSortFieldChange: (field: SongSortField) => void;
  searchError?: string | null;
  showClear?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  footer?: ReactNode;
}

export interface SongBrowserCopy {
  eyebrow: string;
  title: string;
  description: string;
}

export interface SpotifySuggestionState {
  status: "idle" | "success" | "error";
  message: string;
  spotifyTrackId: string | null;
}

export interface DemoSong {
  id: string;
  spotifyId: string;
  title: string;
  artist: string;
  currentTier: Tier;
  submittedBy: string;
}

export interface SongPreferenceResponse {
  songView?: SongView;
}

export interface SongPreferenceRequest {
  songView?: string;
}

export interface SongDataResult<T> {
  data: T | null;
  error: string | null;
  retry: () => void;
}

export interface SongRequestState<T> {
  key: string;
  data: T | null;
  error: string | null;
}

export interface SongResultsProps {
  songs: DisplaySong[];
  view: SongView;
  isAdmin: boolean;
  owners: ParticipantIdentity[];
  onSongChanged: () => void;
}

export interface TierBadgeProps {
  tier: Tier | null;
  tall?: boolean;
}

export interface OwnerLabelProps {
  owner: string;
}

export interface SongActionProps {
  song: DisplaySong;
  isAdmin: boolean;
  owners: ParticipantIdentity[];
  onSongChanged: () => void;
}

export interface SongResultsSkeletonProps {
  view?: SongView;
}

export interface SongSearchProps {
  songs: LegacySongResult[];
  scopeLabel: string;
}

export interface SpotifyLinkDialogProps {
  songId: string;
  title: string;
  pendingSpotifyTrackId: string | null;
  isAdmin: boolean;
  onSongChanged?: () => void;
}

export interface SpotifyTrackPreview {
  spotifyTrackId: string;
  title: string;
  artistName: string | null;
}

export interface SongEditState {
  status: "idle" | "success" | "error";
  message: string;
}

export interface SongEditDialogProps {
  song: DisplaySong;
  owners: ParticipantIdentity[];
  onSongChanged: () => void;
}

export interface SpotifyEditState {
  status: "idle" | "preview" | "success" | "error";
  message: string;
  before: SpotifyTrackPreview | null;
  after: SpotifyTrackPreview | null;
}

export interface SpotifyEditDialogProps {
  song: DisplaySong;
  onSongChanged: () => void;
}

export interface SpotifyEmbedDialogProps {
  trackId: string;
  songTitle: string;
}
