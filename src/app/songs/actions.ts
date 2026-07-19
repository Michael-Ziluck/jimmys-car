"use server";

import { randomUUID } from "node:crypto";

import { and, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { songs, spotifyLinkSuggestions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { normalizeSongTitle } from "@/lib/song-title-matching";
import { getSpotifyTrackMetadata } from "@/lib/spotify";
import { parseSpotifyTrackId } from "@/lib/spotify-track-link";
import type { AppUser, SpotifySuggestionState } from "@/types";

export async function submitSpotifySuggestion(
  songId: string,
  _previousState: SpotifySuggestionState,
  formData: FormData,
): Promise<SpotifySuggestionState> {
  const submittedValue: string =
    formData.get("spotifyTrack")?.toString().trim() ?? "";
  const trackId: string | undefined = await parseSpotifyTrackId(submittedValue);
  if (!trackId) {
    return {
      status: "error",
      message:
        "Enter a 22-character Spotify track ID or Spotify track share link.",
      spotifyTrackId: null,
    };
  }

  const db: ReturnType<typeof getDb> = getDb();
  const [song] = await db
    .select({ id: songs.id, spotifyTrackId: songs.spotifyTrackId })
    .from(songs)
    .where(eq(songs.id, songId))
    .limit(1);
  if (!song)
    return {
      status: "error",
      message: "That song no longer exists.",
      spotifyTrackId: null,
    };
  if (song.spotifyTrackId)
    return {
      status: "error",
      message: "That song has already been linked.",
      spotifyTrackId: null,
    };

  const user: AppUser | null = await getCurrentUser();
  if (user?.role === "admin") {
    const [existingTrack] = await db
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.spotifyTrackId, trackId))
      .limit(1);
    if (existingTrack)
      return {
        status: "error",
        message: "That Spotify track is already linked to another song.",
        spotifyTrackId: null,
      };

    let track: Awaited<ReturnType<typeof getSpotifyTrackMetadata>>;
    try {
      track = await getSpotifyTrackMetadata(trackId);
    } catch {
      return {
        status: "error",
        message: "Spotify could not load metadata for that track.",
        spotifyTrackId: null,
      };
    }
    const normalizedTitle: string = normalizeSongTitle(track.title);
    const [existingTitle] = await db
      .select({ id: songs.id })
      .from(songs)
      .where(
        and(eq(songs.normalizedTitle, normalizedTitle), ne(songs.id, songId)),
      )
      .limit(1);
    if (existingTitle)
      return {
        status: "error",
        message: "That Spotify title already belongs to another song.",
        spotifyTrackId: null,
      };
    const linkedSongs: Array<{ id: string }> = await db
      .update(songs)
      .set({
        title: track.title,
        normalizedTitle,
        spotifyTrackId: trackId,
        artistName: track.artistName,
      })
      .where(and(eq(songs.id, songId), isNull(songs.spotifyTrackId)))
      .returning({ id: songs.id });
    if (!linkedSongs.length)
      return {
        status: "error",
        message: "That song was linked before this save completed.",
        spotifyTrackId: null,
      };
    revalidatePath("/songs");
    revalidatePath("/songs/history");
    revalidatePath("/admin/matches");
    revalidatePath("/admin/matches/history");
    return {
      status: "success",
      message: "Spotify track linked. No review was needed.",
      spotifyTrackId: trackId,
    };
  }

  const [pendingSuggestion] = await db
    .select({ spotifyTrackId: spotifyLinkSuggestions.spotifyTrackId })
    .from(spotifyLinkSuggestions)
    .where(
      and(
        eq(spotifyLinkSuggestions.songId, songId),
        eq(spotifyLinkSuggestions.status, "pending"),
      ),
    )
    .limit(1);
  if (pendingSuggestion)
    return {
      status: "success",
      message: "A suggestion is already awaiting review.",
      spotifyTrackId: pendingSuggestion.spotifyTrackId,
    };

  await db
    .insert(spotifyLinkSuggestions)
    .values({
      id: randomUUID(),
      songId,
      spotifyTrackId: trackId,
      submittedValue,
    })
    .onConflictDoNothing();

  revalidatePath("/admin");
  return {
    status: "success",
    message: "Submitted for review. Thank you.",
    spotifyTrackId: trackId,
  };
}
