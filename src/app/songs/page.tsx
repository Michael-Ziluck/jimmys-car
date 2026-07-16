import { songs } from "@/data/songs";
import { SongSearch } from "./song-search";

export default function SongsPage() {
  return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">Prototype data</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950">Song search</h1>
          <p className="mt-4 max-w-2xl text-stone-600">
              Search this hardcoded sample by song title, artist, or participant. Real playlist data will replace it
              later.
          </p>
          <SongSearch songs={songs}/>
      </main>
  );
}
