import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpotifyTrackMatch } from "@/types";
import { assignSpotifyMatch } from "../actions";
import { MatchesSortSelect } from "./matches-sort-select";

export interface UnlinkedSongMatches {
  id: string;
  title: string;
  current: boolean;
  lastAppearanceDate: string | null;
  matches: SpotifyTrackMatch[];
  error?: string;
}

export function MatchesPage({
  scope,
  songs,
  page,
  pageCount,
  total,
  sort,
}: {
  scope: "current" | "history";
  songs: UnlinkedSongMatches[];
  page: number;
  pageCount: number;
  total: number;
  sort: "song" | "time";
}) {
  const isHistory: boolean = scope === "history";
  const route: string = isHistory ? "/admin/matches/history" : "/admin/matches";
  return (
    <>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-stone-950">Potential matches</h2>
        <p className="mt-2 text-sm text-stone-600">
          Compare unlinked song titles with Spotify results. Artists appear only once, with remasters preferred when available.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild={isHistory} variant={isHistory ? "outline" : "default"}>
          {isHistory ? <Link href="/admin/matches">Current</Link> : "Current"}
        </Button>
        <Button asChild={!isHistory} variant={isHistory ? "default" : "outline"}>
          {isHistory ? "Current + history" : <Link href="/admin/matches/history">Current + history</Link>}
        </Button>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-stone-500">
          {total} unlinked {isHistory ? "songs across current + history" : "current songs"}
        </p>
        <MatchesSortSelect value={sort} />
      </div>
      <div className="mt-4 grid gap-5">
        {songs.map((song) => (
          <Card key={song.id} className="rounded-2xl">
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{song.title}</CardTitle>
                {isHistory ? <Badge variant={song.current ? "default" : "secondary"}>{song.current ? "Current" : "Past"}</Badge> : null}
              </div>
            </CardHeader>
            <CardContent>
              {song.error ? (
                <p className="text-sm text-destructive">{song.error}</p>
              ) : song.matches.length ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {song.matches.map((match) => (
                    <div key={match.id} className="flex min-w-0 flex-col rounded-xl border bg-card p-3">
                      <div className="flex gap-3">
                        {match.imageUrl ? <Image src={match.imageUrl} alt="" width={56} height={56} className="size-14 rounded-md object-cover" unoptimized /> : <div className="size-14 shrink-0 rounded-md bg-muted" />}
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold text-stone-950">{match.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{match.artistName}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="flex-1">
                          <a href={match.spotifyUrl} target="_blank" rel="noreferrer">Listen</a>
                        </Button>
                        <form action={assignSpotifyMatch.bind(null, song.id, match.id)} className="flex-1">
                          <Button type="submit" size="sm" className="w-full">Use match</Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No close Spotify results found.</p>
              )}
            </CardContent>
          </Card>
        ))}
        {!songs.length ? <Card className="rounded-2xl p-10 text-center"><p className="font-semibold">Everything is linked</p><p className="mt-2 text-sm text-muted-foreground">There are no unlinked songs in this view.</p></Card> : null}
      </div>
      {pageCount > 1 ? (
        <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Potential match pages">
          <Button asChild={page > 1} variant="outline" disabled={page === 1}>{page > 1 ? <Link href={`${route}?page=${page - 1}&sort=${sort}`}>Previous</Link> : "Previous"}</Button>
          <p className="text-sm text-stone-500">Page {page} of {pageCount}</p>
          <Button asChild={page < pageCount} variant="outline" disabled={page === pageCount}>{page < pageCount ? <Link href={`${route}?page=${page + 1}&sort=${sort}`}>Next</Link> : "Next"}</Button>
        </nav>
      ) : null}
    </>
  );
}
