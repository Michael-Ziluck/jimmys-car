import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { songs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import type { AppUser, Song } from "@/types";

export async function assignSpotifyMatchRecord(
  songId: string,
  spotifyTrackId: string,
  artistName: string,
): Promise<void> {
  const user: AppUser | null = await getCurrentUser();
  if (!user || user.role !== "admin")
    throw new Error("Administrator access required.");

  const normalizedArtistName: string = artistName.trim();
  if (!normalizedArtistName)
    throw new Error("The Spotify match is missing an artist.");

  const linkedSongs: Array<Pick<Song, "id">> = await getDb()
    .update(songs)
    .set({ spotifyTrackId, artistName: normalizedArtistName })
    .where(and(eq(songs.id, songId), isNull(songs.spotifyTrackId)))
    .returning({ id: songs.id });
  if (!linkedSongs.length)
    throw new Error("This song has already been linked. Refresh the page.");

  revalidatePath("/admin/matches");
  revalidatePath("/admin/matches/history");
  revalidatePath("/songs");
  revalidatePath("/songs/history");
}
