import Link from "next/link";
import { type FormEvent, useEffect } from "react";
import { ArrowDownAZ, Music2, Regex, Search, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  SongBrowserCopy,
  SongBrowserPageProps,
  SongScope,
  SongSortField,
  SongView,
} from "@/types";
import { SongResults } from "./song-results";
import { SongResultsSkeleton } from "./song-results-skeleton";
import {
  ensureStoredSongView,
  useBrowserReady,
  useStoredSongView,
} from "./song-view-toggle";

const copy: Record<SongScope, SongBrowserCopy> = {
  current: {
    eyebrow: "Current tier list",
    title: "Current songs",
    description:
      "Search songs in the latest published edition, including their current owner and tier.",
  },
  history: {
    eyebrow: "Complete tier history",
    title: "Current + history",
    description:
      "Search every imported title. Current songs show their latest owner and tier; inactive songs are marked Past.",
  },
};

export function SongBrowserPage({
  scope,
  songs,
  query,
  onQueryChange,
  countLabel,
  error,
  onRetry,
  onSearch,
  advancedSearch,
  onAdvancedSearchChange,
  searchField,
  onSearchFieldChange,
  sortField,
  onSortFieldChange,
  searchError = null,
  showClear = false,
  emptyTitle,
  emptyDescription,
  footer,
}: SongBrowserPageProps) {
  const view: SongView = useStoredSongView();
  const viewReady: boolean = useBrowserReady();
  const pageCopy: (typeof copy)[SongScope] = copy[scope];
  const isHistory: boolean = scope === "history";

  useEffect(() => {
    void ensureStoredSongView();
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSearch?.();
  };

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10 sm:py-16"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
        {pageCopy.eyebrow}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950">
        {pageCopy.title}
      </h1>
      <p className="mt-4 text-stone-600">{pageCopy.description}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild={isHistory} variant={isHistory ? "outline" : "default"}>
          {isHistory ? <Link href="/songs">Current</Link> : "Current"}
        </Button>
        <Button
          asChild={!isHistory}
          variant={isHistory ? "default" : "outline"}
        >
          {isHistory ? (
            "Current + history"
          ) : (
            <Link href="/songs/history">Current + history</Link>
          )}
        </Button>
      </div>

      <div className="sticky top-[4.25rem] z-20 -mx-2 mt-8 rounded-2xl border bg-background/95 p-2 shadow-sm backdrop-blur sm:top-[4.75rem]">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <form
            onSubmit={submitSearch}
            className="flex min-w-0 flex-1 flex-wrap gap-2"
          >
            <ToggleGroup
              type="single"
              value={searchField}
              onValueChange={(value) => {
                if (value === "song" || value === "artist")
                  onSearchFieldChange(value);
              }}
              variant="outline"
              size="sm"
              className="shrink-0 gap-1 rounded-xl border border-input bg-card p-1"
              aria-label="Search field"
            >
              <ToggleGroupItem
                value="song"
                className="h-10 rounded-lg! border-0 px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                aria-label="Search by song name"
              >
                <Music2 />
                <span className="hidden lg:inline">Song</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="artist"
                className="h-10 rounded-lg! border-0 px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                aria-label="Search by artist"
              >
                <UserRound />
                <span className="hidden lg:inline">Artist</span>
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="relative min-w-48 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-stone-400"
                aria-hidden="true"
              />
              {songs || error ? (
                <Input
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder={
                    advancedSearch
                      ? `Regex for ${searchField === "song" ? "song names" : "artists"}`
                      : `Search ${searchField === "song" ? "song names" : "artists"}`
                  }
                  aria-label={`${advancedSearch ? "Regular expression search" : "Search"} by ${searchField === "song" ? "song name" : "artist"}`}
                  aria-invalid={Boolean(searchError)}
                  className="h-12 rounded-xl bg-card pr-24 pl-11 text-base sm:pr-40"
                />
              ) : (
                <Skeleton
                  className="h-12 rounded-xl"
                  aria-label="Loading search"
                />
              )}
              {!isHistory && query ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-20 -translate-y-1/2 rounded-lg sm:right-32"
                  onClick={() => onQueryChange("")}
                  aria-label="Clear search"
                >
                  <X />
                </Button>
              ) : null}
              <Toggle
                type="button"
                size="sm"
                pressed={advancedSearch}
                onPressedChange={onAdvancedSearchChange}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg px-2 font-mono text-xs data-[state=on]:bg-amber-100 data-[state=on]:text-amber-950"
                aria-label="Use regular expression search"
              >
                <Regex data-icon="inline-start" />
                <span className="sm:hidden">Adv.</span>
                <span className="hidden sm:inline">Advanced</span>
              </Toggle>
            </div>
            {isHistory ? (
              <Button type="submit" className="h-12 rounded-xl px-4 sm:px-5">
                Search
              </Button>
            ) : null}
            {isHistory && showClear ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl px-4"
                onClick={() => onQueryChange("")}
              >
                Clear
              </Button>
            ) : null}
          </form>
          <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-input bg-card p-1">
            <ArrowDownAZ className="ml-2 size-3.5 text-stone-500" aria-hidden="true" />
            <Select value={sortField} onValueChange={(value) => onSortFieldChange(value as SongSortField)}>
              <SelectTrigger className="h-10 min-w-36 rounded-lg border-0 bg-transparent shadow-none focus-visible:ring-0" aria-label="Sort songs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="time">Recently removed</SelectItem>
                <SelectItem value="song">Song name</SelectItem>
                <SelectItem value="artist">Artist name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {searchError ? (
          <p
            className="px-2 pt-2 text-xs font-medium text-destructive"
            role="alert"
          >
            {searchError}
          </p>
        ) : null}
      </div>

      {error ? (
        <div
          className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-6"
          role="alert"
        >
          <p className="font-medium text-stone-900">{error}</p>
          <Button variant="outline" className="mt-4" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : songs ? (
        <>
          {countLabel ? (
            <p
              className="mt-4 font-mono text-xs text-stone-500"
              aria-live="polite"
            >
              {countLabel}
            </p>
          ) : null}
          {songs.length ? (
            <div className="mt-4">
              <SongResults songs={songs} view={view} />
            </div>
          ) : (
            <Card className="mt-4 rounded-2xl p-10 text-center">
              <p className="font-semibold text-stone-900">{emptyTitle}</p>
              <p className="mt-2 text-sm text-stone-500">{emptyDescription}</p>
              <Button
                variant="outline"
                className="mt-5"
                onClick={() => onQueryChange("")}
              >
                Clear search
              </Button>
            </Card>
          )}
          {footer}
        </>
      ) : (
        <>
          <p className="mt-4 font-mono text-xs text-stone-500" role="status">
            Loading songs…
          </p>
          {viewReady ? <SongResultsSkeleton view={view} /> : null}
        </>
      )}
    </main>
  );
}
