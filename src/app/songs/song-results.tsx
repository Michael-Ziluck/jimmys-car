"use client";

import Link from "next/link";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  SongActionProps,
  SongResultsProps,
} from "@/types";
import { SpotifyEmbedDialog } from "./spotify-embed-dialog";
import { SongEditDialog } from "./song-edit-dialog";
import { SpotifyLinkDialog } from "./spotify-link-dialog";
import { OwnerLabel, SongArtwork, TierBadge, tierStyles } from "./song-presentation";

function SongAction({ song, isAdmin, owners, onSongChanged }: SongActionProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {song.spotifyTrackId ? (
        <SpotifyEmbedDialog
          trackId={song.spotifyTrackId}
          songTitle={song.title}
        />
      ) : (
        <SpotifyLinkDialog
          songId={song.id}
          title={song.title}
          pendingSpotifyTrackId={song.pendingSpotifyTrackId}
          isAdmin={isAdmin}
          onSongChanged={onSongChanged}
        />
      )}
      {isAdmin && song.tier ? (
        <SongEditDialog
          song={song}
          owners={owners}
          onSongChanged={onSongChanged}
        />
      ) : null}
    </div>
  );
}

export function SongResults({
  songs,
  view,
  isAdmin,
  owners,
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
                className="group relative grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 p-4 transition-colors hover:bg-amber-50/40 sm:grid-cols-[3rem_minmax(0,1fr)_auto_auto] sm:px-5"
              >
                <Link
                  href={`/songs/${song.id}`}
                  className="absolute inset-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                  aria-label={`View history for ${song.title}`}
                />
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
                <div className="relative z-10 col-start-3 row-start-2 justify-self-end sm:col-start-4 sm:row-start-1">
                  <SongAction
                    song={song}
                    isAdmin={isAdmin}
                    owners={owners}
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
          <Link
            href={`/songs/${song.id}`}
            className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            aria-label={`View history for ${song.title}`}
          />
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
            <CardAction className="relative z-10">
              <TierBadge tier={song.tier} tall />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-5">
            {song.owner ? <OwnerLabel owner={song.owner} /> : <span />}
            <div className="relative z-10">
              <SongAction
                song={song}
                isAdmin={isAdmin}
                owners={owners}
                onSongChanged={onSongChanged}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
