import "server-only";

import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  max,
  sql,
  type SQL,
} from "drizzle-orm";

import { getDb } from "@/db";
import {
  participants,
  songAppearances,
  songs,
  spotifyLinkSuggestions,
  weeklyEditions,
} from "@/db/schema";
import type {
  DisplaySong,
  Song,
  SongHistoryResult,
  SongSearchField,
  SongSortField,
  SpotifyLinkSuggestion,
} from "@/types";

const HISTORY_PAGE_SIZE: number = 60;

async function getLatestEditionId(): Promise<string | undefined> {
  const db: ReturnType<typeof getDb> = getDb();
  const [latestEdition] = await db
    .select({ id: weeklyEditions.id })
    .from(weeklyEditions)
    .where(eq(weeklyEditions.isCanonical, true))
    .orderBy(desc(weeklyEditions.editionDate))
    .limit(1);

  return latestEdition?.id;
}

async function getActiveSongs(
  latestEditionId: string,
  songIds?: string[],
): Promise<DisplaySong[]> {
  const db: ReturnType<typeof getDb> = getDb();

  return db
    .select({
      id: songs.id,
      title: songs.title,
      artistName: songs.artistName,
      spotifyTrackId: songs.spotifyTrackId,
      pendingSpotifyTrackId: spotifyLinkSuggestions.spotifyTrackId,
      tier: songAppearances.tier,
      owner: participants.displayName,
      lastAppearanceDate: weeklyEditions.editionDate,
    })
    .from(songAppearances)
    .innerJoin(songs, eq(songAppearances.songId, songs.id))
    .innerJoin(participants, eq(songAppearances.participantId, participants.id))
    .leftJoin(
      spotifyLinkSuggestions,
      and(
        eq(spotifyLinkSuggestions.songId, songs.id),
        eq(spotifyLinkSuggestions.status, "pending"),
      ),
    )
    .innerJoin(
      weeklyEditions,
      and(
        eq(songAppearances.weeklyEditionId, weeklyEditions.id),
        eq(weeklyEditions.id, latestEditionId),
      ),
    )
    .where(songIds ? inArray(songs.id, songIds) : undefined)
    .orderBy(desc(weeklyEditions.editionDate), songs.title);
}

export async function getCurrentSongs(): Promise<DisplaySong[]> {
  const latestEditionId: string | undefined = await getLatestEditionId();
  return latestEditionId ? getActiveSongs(latestEditionId) : [];
}

export async function getSongHistoryPage(
  query: string,
  requestedPage: number,
  useRegex = false,
  searchField: SongSearchField = "song",
  sortField: SongSortField = "song",
): Promise<SongHistoryResult> {
  const db: ReturnType<typeof getDb> = getDb();
  const normalizedQuery: string = query.trim();
  const filter: SQL<unknown> | undefined =
    normalizedQuery && !useRegex
      ? searchField === "artist"
        ? ilike(songs.artistName, `%${normalizedQuery}%`)
        : ilike(songs.title, `%${normalizedQuery}%`)
      : undefined;
  const regex: RegExp | undefined =
    normalizedQuery && useRegex ? new RegExp(normalizedQuery, "i") : undefined;
  type HistorySong = Pick<
    Song,
    "id" | "title" | "artistName" | "spotifyTrackId"
  > & { lastAppearanceDate: string | null };
  // eslint-disable-next-line @typescript-eslint/typedef -- Drizzle preserves the subquery column types.
  const lastAppearances = db
    .select({
      songId: songAppearances.songId,
      lastAppearanceDate: max(weeklyEditions.editionDate).as(
        "last_appearance_date",
      ),
    })
    .from(songAppearances)
    .innerJoin(
      weeklyEditions,
      eq(songAppearances.weeklyEditionId, weeklyEditions.id),
    )
    .groupBy(songAppearances.songId)
    .as("last_appearances");
  const historyOrder: SQL =
    sortField === "artist"
      ? sql`${songs.artistName} asc nulls last, ${songs.title} asc`
      : sortField === "time"
        ? sql`${lastAppearances.lastAppearanceDate} desc nulls last, ${songs.title} asc`
        : sql`${songs.title} asc`;
  const regexMatches:
    | HistorySong[]
    | undefined = regex
    ? (
        await db
          .select({
            id: songs.id,
            title: songs.title,
            artistName: songs.artistName,
            spotifyTrackId: songs.spotifyTrackId,
            lastAppearanceDate: lastAppearances.lastAppearanceDate,
          })
          .from(songs)
          .leftJoin(lastAppearances, eq(lastAppearances.songId, songs.id))
          .orderBy(historyOrder)
      ).filter((song) =>
        regex.test(
          searchField === "artist" ? (song.artistName ?? "") : song.title,
        ),
      )
    : undefined;
  const [countResult] = regexMatches
    ? [{ total: regexMatches.length }]
    : await db.select({ total: count() }).from(songs).where(filter);
  const total: number = countResult?.total ?? 0;
  const pageCount: number = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const page: number = Math.min(Math.max(1, requestedPage), pageCount);
  const historySongs: HistorySong[] = regexMatches
    ? regexMatches.slice(
        (page - 1) * HISTORY_PAGE_SIZE,
        page * HISTORY_PAGE_SIZE,
      )
    : await db
        .select({
          id: songs.id,
          title: songs.title,
          artistName: songs.artistName,
          spotifyTrackId: songs.spotifyTrackId,
          lastAppearanceDate: lastAppearances.lastAppearanceDate,
        })
        .from(songs)
        .leftJoin(lastAppearances, eq(lastAppearances.songId, songs.id))
        .where(filter)
        .orderBy(historyOrder)
        .limit(HISTORY_PAGE_SIZE)
        .offset((page - 1) * HISTORY_PAGE_SIZE);

  const latestEditionId: string | undefined = await getLatestEditionId();
  const activeSongs: DisplaySong[] =
    latestEditionId && historySongs.length
      ? await getActiveSongs(
          latestEditionId,
          historySongs.map((song) => song.id),
        )
      : [];
  const activeBySongId: Map<string, DisplaySong> = new Map(
    activeSongs.map((song) => [song.id, song]),
  );
  const pendingSuggestions: Array<
    Pick<SpotifyLinkSuggestion, "songId" | "spotifyTrackId">
  > = historySongs.length
    ? await db
        .select({
          songId: spotifyLinkSuggestions.songId,
          spotifyTrackId: spotifyLinkSuggestions.spotifyTrackId,
        })
        .from(spotifyLinkSuggestions)
        .where(
          and(
            inArray(
              spotifyLinkSuggestions.songId,
              historySongs.map((song) => song.id),
            ),
            eq(spotifyLinkSuggestions.status, "pending"),
          ),
        )
    : [];
  const pendingBySongId: Map<string, string> = new Map(
    pendingSuggestions.map((suggestion) => [
      suggestion.songId,
      suggestion.spotifyTrackId,
    ]),
  );

  return {
    songs: historySongs.map((song) => {
      const active: DisplaySong | undefined = activeBySongId.get(song.id);
      return {
        ...song,
        pendingSpotifyTrackId:
          active?.pendingSpotifyTrackId ?? pendingBySongId.get(song.id) ?? null,
        tier: active?.tier ?? null,
        owner: active?.owner ?? null,
      };
    }),
    total,
    page,
    pageCount,
    pageSize: HISTORY_PAGE_SIZE,
  };
}
