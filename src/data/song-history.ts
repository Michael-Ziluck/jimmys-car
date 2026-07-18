import "server-only";

import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";

import { getDb } from "@/db";
import { participants, songAppearances, songs, weeklyEditions } from "@/db/schema";

const HISTORY_PAGE_SIZE: number = 60;

async function getLatestEditionId() : Promise<string | undefined> {
  const db: ReturnType<typeof getDb> = getDb();
  const [latestEdition] = await db
    .select({ id: weeklyEditions.id })
    .from(weeklyEditions)
    .where(eq(weeklyEditions.isCanonical, true))
    .orderBy(desc(weeklyEditions.editionDate))
    .limit(1);

  return latestEdition?.id;
}

async function getActiveSongs(latestEditionId: string, songIds?: string[]) : Promise<{ id: string; title: string; artistName: string | null; spotifyTrackId: string | null; tier: "S" | "A" | "B" | "C" | "D" | "F"; owner: string; }[]> {
  const db: ReturnType<typeof getDb> = getDb();

  return db
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
      and(eq(songAppearances.weeklyEditionId, weeklyEditions.id), eq(weeklyEditions.id, latestEditionId)),
    )
    .where(songIds ? inArray(songs.id, songIds) : undefined)
    .orderBy(desc(weeklyEditions.editionDate), songs.title);
}

export async function getCurrentSongs() : Promise<never[] | { id: string; title: string; artistName: string | null; spotifyTrackId: string | null; tier: "S" | "A" | "B" | "C" | "D" | "F"; owner: string; }[]> {
  const latestEditionId: string | undefined = await getLatestEditionId();
  return latestEditionId ? getActiveSongs(latestEditionId) : [];
}

export async function getSongHistoryPage(query: string, requestedPage: number) : Promise<{ songs: { tier: "S" | "A" | "B" | "C" | "D" | "F" | null; owner: string | null; id: string; title: string; artistName: string | null; spotifyTrackId: string | null; }[]; total: number; page: number; pageCount: number; pageSize: number; }> {
  const db: ReturnType<typeof getDb> = getDb();
  const normalizedQuery: string = query.trim();
  const filter: SQL<unknown> | undefined = normalizedQuery
    ? or(ilike(songs.title, `%${normalizedQuery}%`), ilike(songs.artistName, `%${normalizedQuery}%`))
    : undefined;
  const [countResult] = await db.select({ total: count() }).from(songs).where(filter);
  const total: number = countResult?.total ?? 0;
  const pageCount: number = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const page: number = Math.min(Math.max(1, requestedPage), pageCount);
  const historySongs: { id: string; title: string; artistName: string | null; spotifyTrackId: string | null; }[] = await db
    .select({
      id: songs.id,
      title: songs.title,
      artistName: songs.artistName,
      spotifyTrackId: songs.spotifyTrackId,
    })
    .from(songs)
    .where(filter)
    .orderBy(songs.title)
    .limit(HISTORY_PAGE_SIZE)
    .offset((page - 1) * HISTORY_PAGE_SIZE);

  const latestEditionId: string | undefined = await getLatestEditionId();
  const activeSongs: { id: string; title: string; artistName: string | null; spotifyTrackId: string | null; tier: "S" | "A" | "B" | "C" | "D" | "F"; owner: string; }[] = latestEditionId && historySongs.length
    ? await getActiveSongs(latestEditionId, historySongs.map((song) => song.id))
    : [];
  const activeBySongId: Map<string, { id: string; title: string; artistName: string | null; spotifyTrackId: string | null; tier: "S" | "A" | "B" | "C" | "D" | "F"; owner: string; }> = new Map(activeSongs.map((song) => [song.id, song]));

  return {
    songs: historySongs.map((song) => {
      const active: { id: string; title: string; artistName: string | null; spotifyTrackId: string | null; tier: "S" | "A" | "B" | "C" | "D" | "F"; owner: string; } | undefined = activeBySongId.get(song.id);
      return { ...song, tier: active?.tier ?? null, owner: active?.owner ?? null };
    }),
    total,
    page,
    pageCount,
    pageSize: HISTORY_PAGE_SIZE,
  };
}
