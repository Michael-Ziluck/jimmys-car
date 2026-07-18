"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Tier } from "@/db/types";
import { SpotifyEmbedDialog } from "./spotify-embed-dialog";
import { SpotifyLinkDialog } from "./spotify-link-dialog";

export type SongView = "cards" | "list";

export type DisplaySong = {
  id: string;
  title: string;
  artistName: string | null;
  spotifyTrackId: string | null;
  pendingSpotifyTrackId: string | null;
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

function TierBadge({
  tier,
  tall = false,
}: {
  tier: Tier | null;
  tall?: boolean;
}) {
  const size: string = tall ? "h-12 w-12" : "size-10";

  return tier ? (
    <Badge
      className={`flex ${size} shrink-0 justify-center rounded-xl font-mono text-sm font-bold ${tierStyles[tier]}`}
      title={`${tier} tier`}
    >
      {tier}
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className={`flex ${size} shrink-0 justify-center rounded-xl text-xs`}
    >
      Past
    </Badge>
  );
}

function OwnerLabel({ owner }: { owner: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-amber-900">
      <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      Held by {owner}
    </span>
  );
}

function SongAction({ song }: { song: DisplaySong }) {
  return song.spotifyTrackId ? (
    <SpotifyEmbedDialog trackId={song.spotifyTrackId} songTitle={song.title} />
  ) : (
    <SpotifyLinkDialog
      songId={song.id}
      title={song.title}
      pendingSpotifyTrackId={song.pendingSpotifyTrackId}
    />
  );
}

export function SongResults({
  songs,
  view,
}: {
  songs: DisplaySong[];
  view: SongView;
}) {
  if (view === "list") {
    return (
      <Card className="overflow-hidden rounded-2xl py-0">
        <CardContent className="p-0">
          <ul className="divide-y divide-stone-100">
            {songs.map((song) => (
              <li
                key={song.id}
                className="group grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 p-4 transition-colors hover:bg-amber-50/40 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:px-5"
              >
                <TierBadge tier={song.tier} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-950 sm:truncate">
                    {song.title}
                  </p>
                  <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm text-stone-500">
                    <span className="truncate">
                      {song.artistName ?? "Artist not linked"}
                    </span>
                    {song.owner ? (
                      <>
                        <span className="text-stone-300" aria-hidden="true">
                          /
                        </span>
                        <OwnerLabel owner={song.owner} />
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="col-start-2 justify-self-start sm:col-start-3 sm:row-start-1 sm:justify-self-end">
                  <SongAction song={song} />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {songs.map((song) => (
        <Card
          key={song.id}
          className="group relative min-h-44 justify-between overflow-hidden rounded-2xl transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
        >
          <span
            className={`absolute inset-x-0 top-0 h-1 ${song.tier ? tierStyles[song.tier].split(" ")[0] : "bg-stone-200"}`}
            aria-hidden="true"
          />
          <CardHeader>
            <div className="min-w-0 pr-2">
              <CardTitle className="text-lg text-stone-950">
                {song.title}
              </CardTitle>
              <p className="mt-1 text-sm text-stone-500">
                {song.artistName ?? "Artist not linked"}
              </p>
            </div>
            <CardAction>
              <TierBadge tier={song.tier} tall />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-5">
            {song.owner ? <OwnerLabel owner={song.owner} /> : <span />}
            <SongAction song={song} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
