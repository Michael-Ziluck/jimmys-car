"use server";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { songs, spotifyLinkSuggestions } from "@/db/schema";
import type { SpotifySuggestionState } from "@/types";

function directSpotifyTrackId(value: string): string | undefined {
  const trimmedValue: string = value.trim();
  if (/^[A-Za-z0-9]{22}$/.test(trimmedValue)) return trimmedValue;

  const uriMatch: RegExpMatchArray | null = trimmedValue.match(
    /^spotify:track:([A-Za-z0-9]{22})$/i,
  );
  if (uriMatch) return uriMatch[1];

  try {
    const url: URL = new URL(trimmedValue);
    const pathMatch: RegExpMatchArray | null = url.pathname.match(
      /^\/(?:intl-[^/]+\/)?track\/([A-Za-z0-9]{22})(?:\/|$)/i,
    );
    if (url.hostname === "open.spotify.com" && pathMatch) {
      return pathMatch[1];
    }
  } catch {
    // Validation below returns the user-facing message.
  }
  return undefined;
}

async function spotifyTrackId(value: string): Promise<string | undefined> {
  const directTrackId: string | undefined = directSpotifyTrackId(value);
  if (directTrackId) return directTrackId;

  try {
    const url: URL = new URL(value.trim());
    if (url.hostname !== "spotify.link") return undefined;
    const response: Response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
    });
    return directSpotifyTrackId(response.url);
  } catch {
    return undefined;
  }
}

export async function submitSpotifySuggestion(
  songId: string,
  _previousState: SpotifySuggestionState,
  formData: FormData,
): Promise<SpotifySuggestionState> {
  const submittedValue: string =
    formData.get("spotifyTrack")?.toString().trim() ?? "";
  const trackId: string | undefined = await spotifyTrackId(submittedValue);
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
