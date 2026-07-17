import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCurrentSongs } from "@/data/song-history";
import { SongSearch } from "./song-search";

export default async function SongsPage() {
  const songs = await getCurrentSongs();
  return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">Current tier list</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950">Current songs</h1>
          <p className="mt-4 max-w-2xl text-stone-600">
              Search songs in the latest published edition, including their current owner and tier.
          </p>
          <div className="mt-6 flex gap-2">
            <Button>Current</Button>
            <Button asChild variant="outline"><Link href="/songs/history">Current + history</Link></Button>
          </div>
          <SongSearch songs={songs} scopeLabel="current songs" />
      </main>
  );
}
