"use client";

import Image from "next/image";
import { Music2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  OwnerLabelProps,
  SongActionProps,
  SongResultsProps,
  Tier,
  TierBadgeProps,
} from "@/types";
import { SpotifyEmbedDialog } from "./spotify-embed-dialog";
import { SpotifyEditDialog } from "./spotify-edit-dialog";
import { SpotifyLinkDialog } from "./spotify-link-dialog";

const tierStyles: Record<Tier, string> = {
  S: "bg-rose-100 text-rose-800",
  A: "bg-orange-100 text-orange-800",
  B: "bg-amber-100 text-amber-800",
  C: "bg-lime-100 text-lime-800",
  D: "bg-sky-100 text-sky-800",
  F: "bg-violet-100 text-violet-800",
};

function TierBadge({ tier, tall = false }: TierBadgeProps) {
  return (
    <div
      className={`flex shrink-0 ${tall ? "flex-col items-end gap-1" : "items-center"}`}
      title={tier ? `Current rank: ${tier} tier` : "Past song"}
    >
      {tall ? (
        <span className="text-[0.625rem] font-semibold tracking-[0.12em] text-stone-400 uppercase">
          {tier ? "Current rank" : "Status"}
        </span>
      ) : null}
      <Badge
        variant={tier ? "default" : "outline"}
        className={`h-6 rounded-full px-2.5 font-mono text-[0.6875rem] font-bold ${tier ? tierStyles[tier] : "text-stone-500"}`}
      >
        {tier ? `${tier} tier` : "Past"}
      </Badge>
    </div>
  );
}

function SongArtwork({
  trackId,
  title,
  size,
}: {
  trackId: string | null;
  title: string;
  size: "small" | "large";
}) {
  const [failed, setFailed] = useState(false);
  const dimensions: string = size === "large" ? "size-20" : "size-12";

  return (
    <div
      className={`relative ${dimensions} shrink-0 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-950/5`}
    >
      {trackId && !failed ? (
        <Image
          src={`/api/spotify/art/${trackId}`}
          alt={`Album art for ${title}`}
          fill
          sizes={size === "large" ? "80px" : "48px"}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex size-full items-center justify-center bg-linear-to-br from-amber-50 to-stone-100 text-amber-700/55">
          <Music2 className={size === "large" ? "size-7" : "size-4"} />
          <span className="sr-only">No album art available</span>
        </span>
      )}
    </div>
  );
}

function OwnerLabel({ owner }: OwnerLabelProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-amber-900">
      <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      Held by {owner}
    </span>
  );
}

function SongAction({ song, isAdmin, onSongChanged }: SongActionProps) {
  return song.spotifyTrackId ? (
    <div className="flex items-center justify-end gap-1">
      <SpotifyEmbedDialog trackId={song.spotifyTrackId} songTitle={song.title} />
      {isAdmin ? (
        <SpotifyEditDialog song={song} onSongChanged={onSongChanged} />
      ) : null}
    </div>
  ) : (
    <SpotifyLinkDialog
      songId={song.id}
      title={song.title}
      pendingSpotifyTrackId={song.pendingSpotifyTrackId}
      isAdmin={isAdmin}
      onSongChanged={onSongChanged}
    />
  );
}

export function SongResults({
  songs,
  view,
  isAdmin,
  onSongChanged,
}: SongResultsProps) {
  if (view === "list") {
    return (
      <Card className="overflow-hidden rounded-2xl py-0">
        <CardContent className="p-0">
          <ul className="divide-y divide-stone-100">
            {songs.map((song) => (
              <li
                key={song.id}
                className="group grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 p-4 transition-colors hover:bg-amber-50/40 sm:grid-cols-[3rem_minmax(0,1fr)_auto_auto] sm:px-5"
              >
                <SongArtwork
                  trackId={song.spotifyTrackId}
                  title={song.title}
                  size="small"
                />
                <div className="col-span-2 min-w-0 flex-1 sm:col-span-1">
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
                <div className="col-start-2 row-start-2 sm:col-start-3 sm:row-start-1 sm:justify-self-end">
                  <TierBadge tier={song.tier} />
                </div>
                <div className="col-start-3 row-start-2 justify-self-end sm:col-start-4 sm:row-start-1">
                  <SongAction
                    song={song}
                    isAdmin={isAdmin}
                    onSongChanged={onSongChanged}
                  />
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
          <CardHeader className="gap-4">
            <div className="flex min-w-0 gap-3 pr-2">
              <SongArtwork
                trackId={song.spotifyTrackId}
                title={song.title}
                size="large"
              />
              <div className="min-w-0 pt-0.5">
                <CardTitle className="text-lg text-stone-950">
                  {song.title}
                </CardTitle>
                <p className="mt-1 text-sm text-stone-500">
                  {song.artistName ?? "Artist not linked"}
                </p>
              </div>
            </div>
            <CardAction>
              <TierBadge tier={song.tier} tall />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-5">
            {song.owner ? <OwnerLabel owner={song.owner} /> : <span />}
            <SongAction
              song={song}
              isAdmin={isAdmin}
              onSongChanged={onSongChanged}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
