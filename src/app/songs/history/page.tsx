import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getAllSongs } from "@/data/song-history";
import { SongSearch } from "../song-search";

export default async function SongHistoryPage() {
  const songs = await getAllSongs();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">Complete tier history</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950">Current + historical songs</h1>
      <p className="mt-4 max-w-2xl text-stone-600">
        Search every imported title. Current songs show their latest owner and tier; inactive songs are marked Past.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild variant="outline"><Link href="/songs">Current</Link></Button>
        <Button>Current + history</Button>
      </div>
      <SongSearch songs={songs} scopeLabel="current and historical titles" />
    </main>
  );
}
