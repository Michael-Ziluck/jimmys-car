"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Tier } from "@/db/types";
import { SpotifyEmbedDialog } from "./spotify-embed-dialog";
import { SpotifyLinkDialog } from "./spotify-link-dialog";

type SongResult = { id: string; title: string; artistName: string | null; spotifyTrackId: string | null; tier: Tier; owner: string | null };

const tierStyles: Record<Tier, string> = { S: "bg-rose-100 text-rose-800", A: "bg-orange-100 text-orange-800", B: "bg-amber-100 text-amber-800", C: "bg-lime-100 text-lime-800", D: "bg-sky-100 text-sky-800", F: "bg-violet-100 text-violet-800" };

export function SongCards({ songs }: { songs: SongResult[] }) {
  const [query, setQuery] = useState("");
  const results: SongResult[] = useMemo(() => {
    const needle: string = query.trim().toLowerCase();
    return songs.filter((song) => [song.title, song.artistName ?? "", song.owner ?? ""].some((value) => value.toLowerCase().includes(needle)));
  }, [query, songs]);

  return (
    <>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search song title, artist, or participant…" className="mt-8 h-14 rounded-2xl bg-card px-5 text-base" />
      <p className="mt-4 text-sm text-stone-500">Showing {results.length} of {songs.length} current songs</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((song) => (
          <Card key={song.id} className="min-h-44 justify-between rounded-2xl transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="pr-12 text-lg text-stone-950">{song.title}</CardTitle>
              <CardAction>
                <Badge className={`flex size-10 justify-center rounded-xl text-sm font-bold ${tierStyles[song.tier]}`} title={`${song.tier} tier`}>
                  {song.tier}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-5">
              <div>
                <p className="text-sm text-stone-500">{song.artistName ?? "Artist not linked"}</p>
                {song.owner ? <p className="mt-1 text-sm font-medium text-stone-700">Held by {song.owner}</p> : null}
              </div>
              <div>
                {song.spotifyTrackId ? <SpotifyEmbedDialog trackId={song.spotifyTrackId} songTitle={song.title} /> : <SpotifyLinkDialog songId={song.id} title={song.title} />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {results.length === 0 ? <Card className="mt-4 rounded-2xl p-8 text-center text-stone-500">No current songs match that search.</Card> : null}
    </>
  );
}
