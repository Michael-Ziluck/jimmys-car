"use client";

import { useMemo, useState } from "react";

import {
  SongBrowserPage,
  type SongSearchField,
  type SongSortField,
} from "./song-browser-page";
import { useSongData } from "./use-song-data";

type SongResult = {
  id: string;
  title: string;
  artistName: string | null;
  spotifyTrackId: string | null;
  pendingSpotifyTrackId: string | null;
  tier: "S" | "A" | "B" | "C" | "D" | "F";
  owner: string;
};

export default function SongsPage() {
  const [query, setQuery] = useState("");
  const [advancedSearch, setAdvancedSearch] = useState(false);
  const [searchField, setSearchField] = useState<SongSearchField>("song");
  const [sortField, setSortField] = useState<SongSortField>("song");
  const {
    data: songs,
    error,
    retry,
  } = useSongData<SongResult[]>(
    "/api/songs/current",
    "Could not load current songs.",
  );

  const searchResult: { songs: SongResult[] | null; error: string | null } =
    useMemo(() => {
      if (!songs) return { songs: null, error: null };

      const needle: string = query.trim().toLowerCase();
      const searchableValue = (song: SongResult): string =>
        searchField === "song" ? song.title : (song.artistName ?? "");
      const sortSongs = (matches: SongResult[]): SongResult[] =>
        [...matches].sort((left, right) => {
          if (sortField === "song")
            return left.title.localeCompare(right.title);
          if (!left.artistName)
            return right.artistName ? 1 : left.title.localeCompare(right.title);
          if (!right.artistName) return -1;
          return (
            left.artistName.localeCompare(right.artistName) ||
            left.title.localeCompare(right.title)
          );
        });
      if (!advancedSearch)
        return {
          songs: sortSongs(
            songs.filter((song) =>
              searchableValue(song).toLowerCase().includes(needle),
            ),
          ),
          error: null,
        };

      try {
        const pattern: RegExp = new RegExp(query, "i");
        return {
          songs: sortSongs(
            songs.filter((song) => pattern.test(searchableValue(song))),
          ),
          error: null,
        };
      } catch {
        return {
          songs: [],
          error: "That regular expression is not valid yet.",
        };
      }
    }, [advancedSearch, query, searchField, songs, sortField]);
  const results: SongResult[] | null = searchResult.songs;

  const countLabel: string | null =
    songs && results
      ? `${results.length} of ${songs.length} current songs`
      : null;

  return (
    <SongBrowserPage
      scope="current"
      songs={results}
      query={query}
      onQueryChange={setQuery}
      advancedSearch={advancedSearch}
      onAdvancedSearchChange={setAdvancedSearch}
      searchError={searchResult.error}
      searchField={searchField}
      onSearchFieldChange={setSearchField}
      sortField={sortField}
      onSortFieldChange={setSortField}
      countLabel={countLabel}
      error={error}
      onRetry={retry}
      emptyTitle="No songs found"
      emptyDescription="Try a shorter title, an artist, or an owner's name."
    />
  );
}
