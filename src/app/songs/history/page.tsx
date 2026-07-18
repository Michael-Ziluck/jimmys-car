"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Tier } from "@/db/types";
import { SpotifyEmbedDialog } from "../spotify-embed-dialog";
import { SpotifyLinkDialog } from "../spotify-link-dialog";

type HistoryResult = {
  songs: Array<{
    id: string;
    title: string;
    artistName: string | null;
    spotifyTrackId: string | null;
    tier: Tier | null;
    owner: string | null;
  }>;
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

const tierStyles: Record<Tier, string> = {
  S: "bg-rose-100 text-rose-800",
  A: "bg-orange-100 text-orange-800",
  B: "bg-amber-100 text-amber-800",
  C: "bg-lime-100 text-lime-800",
  D: "bg-sky-100 text-sky-800",
  F: "bg-violet-100 text-violet-800",
};

export default function SongHistoryPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<HistoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params: URLSearchParams = new URLSearchParams({ page: String(page) });
    if (submittedQuery) params.set("q", submittedQuery);
    void fetch(`/api/songs/history?${params}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load song history.");
        return response.json() as Promise<HistoryResult>;
      })
      .then((nextResult) => {
        setError(null);
        setResult(nextResult);
      })
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load song history.",
        ),
      );
  }, [page, submittedQuery]);

  const start: number = result?.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const end: number = result
    ? Math.min(result.page * result.pageSize, result.total)
    : 0;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
        Complete tier history
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950">
        Current + historical songs
      </h1>
      <p className="mt-4 max-w-2xl text-stone-600">
        Search every imported title. Current songs show their latest owner and
        tier; inactive songs are marked Past.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild variant="outline">
          <Link href="/songs">Current</Link>
        </Button>
        <Button>Current + history</Button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSubmittedQuery(query.trim());
        }}
        className="mt-8 flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-stone-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search song title or artist…"
            className="h-14 rounded-2xl bg-card pr-5 pl-11 text-base"
          />
        </div>
        <Button type="submit" className="h-14 rounded-2xl px-6">
          Search history
        </Button>
        {submittedQuery ? (
          <Button
            type="button"
            variant="outline"
            className="h-14 rounded-2xl px-6"
            onClick={() => {
              setQuery("");
              setSubmittedQuery("");
              setPage(1);
            }}
          >
            Clear
          </Button>
        ) : null}
      </form>
      {!result ? (
        <p className="mt-4 rounded-2xl border border-stone-200 p-6 text-sm text-stone-500">
          {error ?? "Loading song history…"}
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-stone-500">
            {submittedQuery
              ? `${result.total} matches`
              : `${result.total} songs`}{" "}
            · Showing {start}–{end}
          </p>
          <Card className="mt-4 overflow-hidden rounded-2xl py-0">
            <CardContent className="p-0">
              {result.songs.length ? (
                <ul className="divide-y divide-stone-100">
                  {result.songs.map((song) => (
                    <li
                      key={song.id}
                      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:px-6"
                    >
                      {song.tier ? (
                        <Badge
                          className={`flex size-10 shrink-0 justify-center rounded-xl text-sm font-bold ${tierStyles[song.tier]}`}
                        >
                          {song.tier}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="flex size-10 shrink-0 justify-center rounded-xl text-xs"
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
                        />
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-10 text-center text-stone-500">
                  No historical songs match “{submittedQuery}”.
                </p>
              )}
            </CardContent>
          </Card>
          {result.pageCount > 1 ? (
            <nav
              className="mt-6 flex items-center justify-between gap-4"
              aria-label="History pages"
            >
              <Button
                variant="outline"
                disabled={result.page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <p className="text-sm text-stone-500">
                Page {result.page} of {result.pageCount}
              </p>
              <Button
                variant="outline"
                disabled={result.page === result.pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </main>
  );
}
