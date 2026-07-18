"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import {
  appSettings,
  appUsers,
  participants,
  songs,
  spotifyLinkSuggestions,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getSpotifyTrackMetadata } from "@/lib/spotify";
import type { AppUser, ExtraLink, NewAppSetting, Song } from "@/types";

async function requireAdmin(): Promise<AppUser> {
  const user: AppUser | null = await getCurrentUser();
  if (!user || user.role !== "admin")
    throw new Error("Administrator access required.");
  return user;
}

export async function approveSpotifySuggestion(
  suggestionId: string,
): Promise<void> {
  await requireAdmin();
  const db: ReturnType<typeof getDb> = getDb();
  const [suggestion] = await db
    .select({
      songId: spotifyLinkSuggestions.songId,
      spotifyTrackId: spotifyLinkSuggestions.spotifyTrackId,
    })
    .from(spotifyLinkSuggestions)
    .where(
      and(
        eq(spotifyLinkSuggestions.id, suggestionId),
        eq(spotifyLinkSuggestions.status, "pending"),
      ),
    )
    .limit(1);

  if (!suggestion) return;

  const track: Awaited<ReturnType<typeof getSpotifyTrackMetadata>> =
    await getSpotifyTrackMetadata(suggestion.spotifyTrackId);

  const linkedSongs: Array<Pick<Song, "id">> = await db
    .update(songs)
    .set({
      spotifyTrackId: suggestion.spotifyTrackId,
      artistName: track.artistName,
    })
    .where(and(eq(songs.id, suggestion.songId), isNull(songs.spotifyTrackId)))
    .returning({ id: songs.id });

  if (!linkedSongs.length) return;

  await db
    .update(spotifyLinkSuggestions)
    .set({ status: "approved" })
    .where(eq(spotifyLinkSuggestions.id, suggestionId));

  revalidatePath("/admin");
  revalidatePath("/songs");
  revalidatePath("/songs/history");
}

export async function assignSpotifyMatch(
  songId: string,
  spotifyTrackId: string,
): Promise<void> {
  await requireAdmin();
  const track: Awaited<ReturnType<typeof getSpotifyTrackMetadata>> =
    await getSpotifyTrackMetadata(spotifyTrackId);
  await getDb()
    .update(songs)
    .set({ spotifyTrackId, artistName: track.artistName })
    .where(and(eq(songs.id, songId), isNull(songs.spotifyTrackId)));
  revalidatePath("/admin/matches");
  revalidatePath("/admin/matches/history");
  revalidatePath("/songs");
  revalidatePath("/songs/history");
}

export async function promoteUserToAdmin(userId: string): Promise<void> {
  const admin: AppUser = await requireAdmin();
  if (admin.id === userId) throw new Error("Choose another registered user.");
  await getDb()
    .update(appUsers)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(appUsers.id, userId));
  revalidatePath("/admin/users");
}

export async function assignParticipantSpotifyId(
  participantId: string,
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const spotifyAccountId: string =
    formData.get("spotifyAccountId")?.toString().trim() ?? "";
  if (!spotifyAccountId) throw new Error("Spotify user ID is required.");
  await getDb()
    .update(participants)
    .set({ spotifyAccountId })
    .where(eq(participants.id, participantId));
  revalidatePath("/admin/users");
}

export async function updateExternalLinks(formData: FormData): Promise<void> {
  await requireAdmin();
  const values: NewAppSetting[] = ["spreadsheet_url", "playlist_url"].map(
    (key) => {
      const value: string = formData.get(key)?.toString().trim() ?? "";
      const url: URL = new URL(value);
      if (url.protocol !== "https:")
        throw new Error("External links must use HTTPS.");
      return { key, value: url.toString(), updatedAt: new Date() };
    },
  );
  const labels: Array<string> = formData
    .getAll("extra_label")
    .map((value) => value.toString().trim());
  const urls: Array<string> = formData
    .getAll("extra_url")
    .map((value) => value.toString().trim());
  const extraLinks: ExtraLink[] = labels.map((label, index) => {
    if (!label || !urls[index])
      throw new Error("Each additional link needs a name and URL.");
    const url: URL = new URL(urls[index]);
    if (url.protocol !== "https:")
      throw new Error("External links must use HTTPS.");
    return { label, url: url.toString() };
  });
  values.push({
    key: "extra_links",
    value: JSON.stringify(extraLinks),
    updatedAt: new Date(),
  });
  await getDb().insert(appSettings).values(values).onConflictDoNothing();
  for (const value of values)
    await getDb()
      .update(appSettings)
      .set({ value: value.value, updatedAt: value.updatedAt })
      .where(eq(appSettings.key, value.key));
  revalidatePath("/admin/links");
  revalidatePath("/links");
}
