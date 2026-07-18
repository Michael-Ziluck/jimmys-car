"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Tier } from "@/db/types";
import { SpotifyEmbedDialog } from "./spotify-embed-dialog";
import { SpotifyLinkDialog } from "./spotify-link-dialog";

type SongResult = {
  id: string;
  title: string;
  artistName: string | null;
  spotifyTrackId: string | null;
  tier: Tier | null;
  owner: string | null;
};
const tierStyles: Record<Tier, string> = {
  S: "bg-rose-100 text-rose-800",
  A: "bg-orange-100 text-orange-800",
  B: "bg-amber-100 text-amber-800",
  C: "bg-lime-100 text-lime-800",
  D: "bg-sky-100 text-sky-800",
  F: "bg-violet-100 text-violet-800",
};

export function SongSearch({
  songs,
  scopeLabel,
}: {
  songs: SongResult[];
  scopeLabel: string;
}) {
  const [query, setQuery] = useState("");
  const results: SongResult[] = useMemo(
    () =>
      songs.filter((song) =>
        [song.title, song.artistName ?? "", song.owner ?? ""].some((value) =>
          value.toLowerCase().includes(query.trim().toLowerCase()),
        ),
      ),
    [query, songs],
  );
  return (
    <>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search song title or participant…"
        className="mt-8 h-14 rounded-2xl bg-card px-5 text-base"
      />
      <p className="mt-4 text-sm text-stone-500">
        Showing {results.length} of {songs.length} {scopeLabel}
      </p>
      <Card className="mt-4 overflow-hidden rounded-2xl py-0">
        <CardContent className="p-0">
          <ul className="divide-y divide-stone-100">
            {results.map((song) => (
              <li
                key={song.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:px-6"
              >
                {song.tier ? (
                  <span
                    className="group relative shrink-0"
                    title={song.owner ?? `${song.tier} tier`}
                    aria-label={
                      song.owner
                        ? `Owner: ${song.owner}; ${song.tier} tier`
                        : `${song.tier} tier`
                    }
                    tabIndex={song.owner ? 0 : undefined}
                  >
                    <Badge
                      className={`flex h-10 w-10 justify-center rounded-xl text-sm font-bold ${tierStyles[song.tier]}`}
                    >
                      {song.tier}
                    </Badge>
                    {song.owner ? (
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-950 px-2 py-1 text-xs font-medium text-white group-hover:block group-focus:block">
                        {song.owner}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <Badge
                    variant="outline"
                    className="flex h-10 w-10 shrink-0 justify-center rounded-xl text-xs"
                  >
                    Past
                  </Badge>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-stone-950">
                    {song.title}
                  </p>
                  <p className="truncate text-sm text-stone-500">
                    {song.artistName ??
                      (song.owner
                        ? `Currently held by ${song.owner}`
                        : "Historical title")}
                  </p>
                </div>
                {song.spotifyTrackId ? (
                  <SpotifyEmbedDialog
                    trackId={song.spotifyTrackId}
                    songTitle={song.title}
                  />
                ) : (
                  <SpotifyLinkDialog
                    songId={song.id}
                    title={song.title}
                    pendingSpotifyTrackId={null}
                  />
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
