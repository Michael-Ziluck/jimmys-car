"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
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
import { normalizeSongTitle } from "@/lib/song-title-matching";
import { getSpotifyTrackMetadata } from "@/lib/spotify";
import { parseSpotifyTrackId } from "@/lib/spotify-track-link";
import type {
  AppUser,
  ExtraLink,
  NewAppSetting,
  Song,
  SpotifyEditState,
  SpotifyTrackPreview,
} from "@/types";

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
  const normalizedTitle: string = normalizeSongTitle(track.title);
  const [existingTitle] = await db
    .select({ id: songs.id })
    .from(songs)
    .where(
      and(
        eq(songs.normalizedTitle, normalizedTitle),
        ne(songs.id, suggestion.songId),
      ),
    )
    .limit(1);

  if (existingTitle) return;

  const linkedSongs: Array<Pick<Song, "id">> = await db
    .update(songs)
    .set({
      title: track.title,
      normalizedTitle,
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
  revalidatePath("/admin/matches");
  revalidatePath("/admin/matches/history");
  revalidatePath("/songs");
  revalidatePath("/songs/history");
}

async function songEditPreview(
  songId: string,
  submittedValue: string,
): Promise<SpotifyEditState> {
  await requireAdmin();
  const trackId: string | undefined =
    await parseSpotifyTrackId(submittedValue);
  if (!trackId)
    return {
      status: "error",
      message:
        "Enter a 22-character Spotify track ID or Spotify track share link.",
      before: null,
      after: null,
    };

  const db: ReturnType<typeof getDb> = getDb();
  const [song] = await db
    .select({
      id: songs.id,
      title: songs.title,
      artistName: songs.artistName,
      spotifyTrackId: songs.spotifyTrackId,
    })
    .from(songs)
    .where(eq(songs.id, songId))
    .limit(1);
  if (!song?.spotifyTrackId)
    return {
      status: "error",
      message: "That song is no longer linked to Spotify.",
      before: null,
      after: null,
    };
  if (song.spotifyTrackId === trackId)
    return {
      status: "error",
      message: "That is already this song's Spotify track.",
      before: null,
      after: null,
    };

  const [existingTrack] = await db
    .select({ id: songs.id })
    .from(songs)
    .where(and(eq(songs.spotifyTrackId, trackId), ne(songs.id, songId)))
    .limit(1);
  if (existingTrack)
    return {
      status: "error",
      message: "That Spotify track is already linked to another song.",
      before: null,
      after: null,
    };

  let track: Awaited<ReturnType<typeof getSpotifyTrackMetadata>>;
  try {
    track = await getSpotifyTrackMetadata(trackId);
  } catch {
    return {
      status: "error",
      message: "Spotify could not load metadata for that track.",
      before: null,
      after: null,
    };
  }
  const normalizedTitle: string = normalizeSongTitle(track.title);
  const [existingTitle] = await db
    .select({ id: songs.id })
    .from(songs)
    .where(and(eq(songs.normalizedTitle, normalizedTitle), ne(songs.id, songId)))
    .limit(1);
  if (existingTitle)
    return {
      status: "error",
      message:
        "That Spotify title already belongs to another song in the archive.",
      before: null,
      after: null,
    };

  const before: SpotifyTrackPreview = {
    spotifyTrackId: song.spotifyTrackId,
    title: song.title,
    artistName: song.artistName,
  };
  const after: SpotifyTrackPreview = {
    spotifyTrackId: trackId,
    title: track.title,
    artistName: track.artistName,
  };
  return { status: "preview", message: "", before, after };
}

export async function previewSpotifySongEdit(
  songId: string,
  _previousState: SpotifyEditState,
  formData: FormData,
): Promise<SpotifyEditState> {
  const submittedValue: string =
    formData.get("spotifyTrack")?.toString().trim() ?? "";
  return songEditPreview(songId, submittedValue);
}

export async function confirmSpotifySongEdit(
  songId: string,
  expectedTrackId: string,
  nextTrackId: string,
): Promise<SpotifyEditState> {
  const preview: SpotifyEditState = await songEditPreview(songId, nextTrackId);
  if (
    preview.status !== "preview" ||
    !preview.before ||
    !preview.after
  )
    return preview;
  if (preview.before.spotifyTrackId !== expectedTrackId)
    return {
      status: "error",
      message:
        "This song changed after the confirmation was prepared. Review it again.",
      before: null,
      after: null,
    };

  const updatedSongs: Array<Pick<Song, "id">> = await getDb()
    .update(songs)
    .set({
      title: preview.after.title,
      normalizedTitle: normalizeSongTitle(preview.after.title),
      artistName: preview.after.artistName,
      spotifyTrackId: preview.after.spotifyTrackId,
    })
    .where(
      and(
        eq(songs.id, songId),
        eq(songs.spotifyTrackId, expectedTrackId),
      ),
    )
    .returning({ id: songs.id });
  if (!updatedSongs.length)
    return {
      status: "error",
      message:
        "This song changed before the edit was saved. Review it again.",
      before: null,
      after: null,
    };

  revalidatePath("/songs");
  revalidatePath("/songs/history");
  return {
    ...preview,
    status: "success",
    message: "Spotify track and metadata updated.",
  };
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
