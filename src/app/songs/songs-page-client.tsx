"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState, type ComponentType } from "react";

import { Button } from "@/components/ui/button";

const SongCards: ComponentType<{ songs: SongResult[] }> = dynamic(() => import("./song-cards").then((module) => module.SongCards));

type SongResult = {
  id: string;
  title: string;
  artistName: string | null;
  spotifyTrackId: string | null;
  tier: "S" | "A" | "B" | "C" | "D" | "F";
  owner: string;
};

export function SongsPageClient() {
  const [songs, setSongs] = useState<SongResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/songs/current", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load current songs.");
        return response.json() as Promise<SongResult[]>;
      })
      .then(setSongs)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load current songs.",
        ),
      );
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
        Current tier list
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950">
        Current songs
      </h1>
      <p className="mt-4 max-w-2xl text-stone-600">
        Search songs in the latest published edition, including their current
        owner and tier.
      </p>
      <div className="mt-6 flex gap-2">
        <Button>Current</Button>
        <Button asChild variant="outline">
          <Link href="/songs/history">Current + history</Link>
        </Button>
      </div>
      {songs ? (
        <SongCards songs={songs} />
      ) : (
        <p className="mt-8 rounded-2xl border border-stone-200 p-6 text-sm text-stone-500">
          {error ?? "Loading current songs…"}
        </p>
      )}
    </main>
  );
}
