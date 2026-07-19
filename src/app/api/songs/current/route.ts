import { getCurrentSongs } from "@/data/song-history";
import { getCurrentUser } from "@/lib/auth";
import type { AppUser, DisplaySong, SongSearchResult } from "@/types";

export async function GET(): Promise<Response> {
  const [songs, user]: [DisplaySong[], AppUser | null] = await Promise.all([
    getCurrentSongs(),
    getCurrentUser(),
  ]);
  const result: SongSearchResult = {
    songs,
    isAdmin: user?.role === "admin",
  };
  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
