import { getCurrentSongs, getParticipantOptions } from "@/data/song-history";
import { getCurrentUser } from "@/lib/auth";
import type { AppUser, DisplaySong, SongSearchResult } from "@/types";

export async function GET(): Promise<Response> {
  const [songs, user]: [DisplaySong[], AppUser | null] = await Promise.all([
    getCurrentSongs(),
    getCurrentUser(),
  ]);
  const isAdmin: boolean = user?.role === "admin";
  const result: SongSearchResult = {
    songs,
    isAdmin,
    owners: isAdmin ? await getParticipantOptions() : [],
  };
  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
