"use client";

import { useMemo, useState } from "react";

import type {
  DisplaySong,
  SongFilterResult,
  SongSearchResult,
  SongSearchField,
  SongSortField,
} from "@/types";
import { SongBrowserPage } from "./song-browser-page";
import { useSongData } from "./use-song-data";

export default function SongsPage() {
  const [query, setQuery] = useState("");
  const [advancedSearch, setAdvancedSearch] = useState(false);
  const [searchField, setSearchField] = useState<SongSearchField>("song");
  const [sortField, setSortField] = useState<SongSortField>("song");
  const {
    data: result,
    error,
    retry,
  } = useSongData<SongSearchResult>(
    "/api/songs/current",
    "Could not load current songs.",
  );

  const searchResult: SongFilterResult = useMemo(() => {
    const songs: DisplaySong[] | undefined = result?.songs;
    if (!songs) return { songs: null, error: null };

    const needle: string = query.trim().toLowerCase();
    const searchableValue = (song: DisplaySong): string =>
      searchField === "song" ? song.title : (song.artistName ?? "");
    const sortSongs = (matches: DisplaySong[]): DisplaySong[] =>
      [...matches].sort((left, right) => {
        if (sortField === "song") return left.title.localeCompare(right.title);
        if (sortField === "time")
          return (
            (right.lastAppearanceDate ?? "").localeCompare(
              left.lastAppearanceDate ?? "",
            ) || left.title.localeCompare(right.title)
          );
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
  }, [advancedSearch, query, result, searchField, sortField]);
  const results: DisplaySong[] | null = searchResult.songs;
  const songs: DisplaySong[] | undefined = result?.songs;

  const countLabel: string | null =
    songs && results
      ? `${results.length} of ${songs.length} current songs`
      : null;

  return (
    <SongBrowserPage
      scope="current"
      songs={results}
      isAdmin={result?.isAdmin ?? false}
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
