import "server-only";

import { and, asc, count, desc, eq, inArray, isNull, max, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/db";
import { songAppearances, songs, weeklyEditions } from "@/db/schema";
import { searchSpotifyTrackMatches } from "@/lib/spotify";
import type { UnlinkedSongMatches } from "./matches-page";

const PAGE_SIZE: number = 8;

export interface PotentialMatchesResult {
  songs: UnlinkedSongMatches[];
  total: number;
  page: number;
  pageCount: number;
}

export async function getPotentialMatches(
  scope: "current" | "history",
  requestedPage: number,
  sort: "song" | "time",
): Promise<PotentialMatchesResult> {
  const db: ReturnType<typeof getDb> = getDb();
  const [latest] = await db.select({ id: weeklyEditions.id }).from(weeklyEditions).where(eq(weeklyEditions.isCanonical, true)).orderBy(desc(weeklyEditions.editionDate)).limit(1);
  const currentIds: string[] = latest
    ? (await db.selectDistinct({ id: songAppearances.songId }).from(songAppearances).where(eq(songAppearances.weeklyEditionId, latest.id))).map((row) => row.id)
    : [];
  const filter: SQL | undefined = scope === "current"
    ? and(isNull(songs.spotifyTrackId), currentIds.length ? inArray(songs.id, currentIds) : eq(songs.id, ""))
    : isNull(songs.spotifyTrackId);
  const [totalRow] = await db.select({ total: count() }).from(songs).where(filter);
  const total: number = totalRow?.total ?? 0;
  const pageCount: number = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page: number = Math.min(Math.max(requestedPage, 1), pageCount);
  // eslint-disable-next-line @typescript-eslint/typedef -- Drizzle preserves the subquery column types.
  const lastAppearances = db
    .select({
      songId: songAppearances.songId,
      lastAppearanceDate: max(weeklyEditions.editionDate).as("last_appearance_date"),
    })
    .from(songAppearances)
    .innerJoin(weeklyEditions, eq(songAppearances.weeklyEditionId, weeklyEditions.id))
    .groupBy(songAppearances.songId)
    .as("last_appearances");
  const rows: Array<{ id: string; title: string; lastAppearanceDate: string | null }> = await db.select({ id: songs.id, title: songs.title, lastAppearanceDate: lastAppearances.lastAppearanceDate }).from(songs).leftJoin(lastAppearances, eq(lastAppearances.songId, songs.id)).where(filter).orderBy(sort === "time" ? sql`${lastAppearances.lastAppearanceDate} desc nulls last, ${songs.title} asc` : asc(songs.title)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
  const currentSet: Set<string> = new Set(currentIds);
  const matched: UnlinkedSongMatches[] = await Promise.all(rows.map(async (song) => {
    try {
      return { ...song, current: currentSet.has(song.id), matches: await searchSpotifyTrackMatches(song.title) };
    } catch {
      return { ...song, current: currentSet.has(song.id), matches: [], error: "Spotify search is temporarily unavailable." };
    }
  }));
  return { songs: matched, total, page, pageCount };
}
