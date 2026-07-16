"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Song, Tier } from "@/data/songs";

const tierStyles: Record<Tier, string> = {
  S: "bg-rose-100 text-rose-800",
  A: "bg-orange-100 text-orange-800",
  B: "bg-amber-100 text-amber-800",
  C: "bg-lime-100 text-lime-800",
  D: "bg-sky-100 text-sky-800",
  F: "bg-violet-100 text-violet-800",
};

export function SongSearch({ songs }: { songs: Song[] }) {
  const [query, setQuery] = useState("");
  const filteredSongs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return songs;
    return songs.filter((song) =>
      [song.title, song.artist, song.submittedBy].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [query, songs]);

  return (
    <>
      <label htmlFor="song-search" className="sr-only">Search by song, artist, or participant</label>
      <Input
        id="song-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by song, artist, or participant…"
        className="mt-8 h-14 rounded-2xl bg-card px-5 text-base shadow-sm focus-visible:border-amber-700 focus-visible:ring-amber-200"
      />
      <p className="mt-4 text-sm text-stone-500" aria-live="polite">
        Showing {filteredSongs.length} of {songs.length} demo songs
      </p>
      <Card className="mt-4 overflow-hidden rounded-2xl py-0 shadow-sm">
        <CardContent className="p-0">
        {filteredSongs.length ? (
          <ul className="divide-y divide-stone-100">
            {filteredSongs.map((song) => (
              <li key={song.id} className="flex items-center gap-4 p-5 sm:px-6">
                <Badge className={`flex h-10 w-10 shrink-0 justify-center rounded-xl text-sm font-bold ${tierStyles[song.currentTier]}`}>
                  {song.currentTier}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-stone-950">{song.title}</p>
                  <p className="truncate text-sm text-stone-500">{song.artist}</p>
                </div>
                <p className="hidden text-sm text-stone-500 sm:block">Added by {song.submittedBy}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-8 text-center text-muted-foreground">No demo songs match that search.</p>
        )}
        </CardContent>
      </Card>
    </>
  );
}
