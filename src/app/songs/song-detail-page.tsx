"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CalendarDays, Clock3, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  DisplaySong,
  SongDetailResult,
  SongHistoryEntry,
  SongTierStint,
} from "@/types";
import { SongEditDialog } from "./song-edit-dialog";
import { SongArtwork, TierBadge } from "./song-presentation";
import { useSongData } from "./use-song-data";

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function DetailStat({
  label,
  value,
  detail,
  action,
}: {
  label: string;
  value: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <Card size="sm" className="rounded-2xl">
      <CardHeader>
        <CardDescription className="text-xs font-semibold tracking-[0.12em] uppercase">
          {label}
        </CardDescription>
        <CardTitle className="text-lg text-stone-950">{value}</CardTitle>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="text-sm text-stone-500">{detail}</CardContent>
    </Card>
  );
}

function StintSummary({
  stint,
  isLatest,
}: {
  stint: SongTierStint;
  isLatest: boolean;
}) {
  const status: string = stint.leftAt
    ? `Left by ${formatDate(stint.leftAt)}`
    : "Still on the list";
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-medium text-stone-950">
          {formatDate(stint.enteredAt)} – {formatDate(stint.lastRatedAt)}
        </p>
        <p className="mt-1 text-sm text-stone-500">
          {stint.editionCount} {stint.editionCount === 1 ? "edition" : "editions"}
        </p>
      </div>
      <Badge variant={stint.leftAt ? "outline" : "secondary"}>
        {isLatest ? status : `Previous stint · ${status}`}
      </Badge>
    </li>
  );
}

function RatingHistory({ history }: { history: SongHistoryEntry[] }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl text-stone-950">
          <History />
          Rating history
        </CardTitle>
        <CardDescription>
          Every canonical weekly rating, newest first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol>
          {[...history].reverse().map((entry, index) => (
            <li key={`${entry.editionDate}-${entry.owner.id}-${index}`}>
              {index > 0 ? <Separator /> : null}
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-stone-950">
                    {formatDate(entry.editionDate)}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    Held by {entry.owner.displayName}
                  </p>
                </div>
                <TierBadge tier={entry.tier} />
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export function SongDetailPage({ songId }: { songId: string }) {
  const { data: result, error, retry } = useSongData<SongDetailResult>(
    `/api/songs/${encodeURIComponent(songId)}`,
    "Could not load this song's history.",
  );

  if (error) {
    return (
      <main
        id="main-content"
        className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10 sm:py-16"
      >
        <Button asChild variant="ghost">
          <Link href="/songs">
            <ArrowLeft data-icon="inline-start" />
            All songs
          </Link>
        </Button>
        <Card className="mt-6 rounded-2xl border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>Song history unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!result) return null;

  const { song } = result;
  const latestStint: SongTierStint | undefined = song.stints.at(-1);
  const latestRating: SongHistoryEntry | undefined = song.history.at(-1);
  const editableSong: DisplaySong | null =
    result.isAdmin && song.isActive && latestRating
      ? {
          id: song.id,
          title: song.title,
          artistName: song.artistName,
          spotifyTrackId: song.spotifyTrackId,
          pendingSpotifyTrackId: null,
          tier: latestRating.tier,
          ownerId: latestRating.owner.id,
          owner: latestRating.owner.displayName,
          lastAppearanceDate: song.lastAppearanceDate,
        }
      : null;
  const stintLabel: string = song.isActive ? "Current run" : "Final run";
  const stintDetail: string = latestStint?.leftAt
    ? `Left by ${formatDate(latestStint.leftAt)}`
    : "Still on the current list";

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10 sm:py-16"
    >
      <Button asChild variant="ghost">
        <Link href="/songs/history">
          <ArrowLeft data-icon="inline-start" />
          All songs
        </Link>
      </Button>

      <section className="mt-6">
        <p className="text-sm font-semibold tracking-[0.22em] text-amber-700 uppercase">
          Song history
        </p>
        <div className="mt-4 flex items-start gap-4">
          <SongArtwork trackId={song.spotifyTrackId} title={song.title} size="large" />
          <div className="min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
                {song.title}
              </h1>
              <TierBadge tier={latestRating?.tier ?? null} />
            </div>
            <p className="mt-2 text-stone-600">
              {song.artistName ?? "Artist not linked"}
            </p>
          </div>
        </div>
      </section>

      <section
        className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Song history summary"
      >
        <DetailStat
          label="First entered"
          value={
            song.firstAppearanceDate
              ? formatDate(song.firstAppearanceDate)
              : "Unknown"
          }
          detail="First imported appearance"
        />
        <DetailStat
          label="Latest rating"
          value={
            song.lastAppearanceDate
              ? formatDate(song.lastAppearanceDate)
              : "Unknown"
          }
          action={
            editableSong ? (
              <SongEditDialog
                song={editableSong}
                owners={result.owners}
                onSongChanged={retry}
              />
            ) : undefined
          }
          detail={latestRating ? `${latestRating.tier} tier · ${latestRating.owner.displayName}` : "No ratings recorded"}
        />
        <DetailStat
          label={stintLabel}
          value={latestStint ? `${latestStint.editionCount} editions` : "No editions"}
          detail={stintDetail}
        />
        <DetailStat
          label="Lifetime"
          value={`${song.appearanceCount} editions`}
          detail={song.isActive ? "Currently on the list" : "No longer on the list"}
        />
      </section>

      <section className="mt-8 grid gap-8 lg:items-start lg:grid-cols-[minmax(0,1fr)_20rem]">
        <RatingHistory history={song.history} />
        <aside className="h-fit lg:sticky lg:top-26 lg:self-start">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-stone-950">
                <CalendarDays />
                Stints on the list
              </CardTitle>
              <CardDescription>
                A stint ends at the first later canonical edition where the song is absent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul>
                {song.stints.map((stint, index) => (
                  <StintSummary
                    key={stint.enteredAt}
                    stint={stint}
                    isLatest={index === song.stints.length - 1}
                  />
                ))}
              </ul>
              <Separator className="my-4" />
              <p className="flex items-start gap-2 text-sm text-stone-500">
                <Clock3 className="mt-0.5 shrink-0" />
                Duration is measured in published editions, so it stays accurate even when an edition date is skipped.
              </p>
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  );
}
