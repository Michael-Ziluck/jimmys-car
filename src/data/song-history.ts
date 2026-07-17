import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { participants, songAppearances, songs, weeklyEditions } from "@/db/schema";

async function getSongsWithCurrentStatus() {
  const db = getDb();
  const [latestEdition] = await db
    .select({ id: weeklyEditions.id })
    .from(weeklyEditions)
    .where(eq(weeklyEditions.isCanonical, true))
    .orderBy(desc(weeklyEditions.editionDate))
    .limit(1);

  if (!latestEdition) return [];

  const activeSongs = await db
    .select({
      id: songs.id,
      title: songs.title,
      artistName: songs.artistName,
      spotifyTrackId: songs.spotifyTrackId,
      tier: songAppearances.tier,
      owner: participants.displayName,
    })
    .from(songAppearances)
    .innerJoin(songs, eq(songAppearances.songId, songs.id))
    .innerJoin(participants, eq(songAppearances.participantId, participants.id))
    .innerJoin(
      weeklyEditions,
      and(eq(songAppearances.weeklyEditionId, weeklyEditions.id), eq(weeklyEditions.id, latestEdition.id)),
    )
    .orderBy(desc(weeklyEditions.editionDate), songs.title);

  const activeBySongId = new Map(activeSongs.map((song) => [song.id, song]));
  const allSongs = await db.select().from(songs).orderBy(songs.title);

  return allSongs.map((song) => {
    const active = activeBySongId.get(song.id);
    return {
      id: song.id,
      title: song.title,
      artistName: song.artistName,
      spotifyTrackId: song.spotifyTrackId,
      tier: active?.tier ?? null,
      owner: active?.owner ?? null,
    };
  });
}

export async function getCurrentSongs() {
  return (await getSongsWithCurrentStatus()).filter((song) => song.tier !== null);
}

export async function getAllSongs() {
  return getSongsWithCurrentStatus();
}
