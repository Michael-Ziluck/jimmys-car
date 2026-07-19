import { createHash } from "node:crypto";

import { loadEnvConfig } from "@next/env";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import * as XLSX from "xlsx";

import { getDb } from "@/db";
import {
  appSettings,
  appUsers,
  participants,
  songAppearances,
  songs,
  sourceSpreadsheets,
  weeklyEditions,
} from "@/db/schema";
import { HISTORICAL_SHEET_SOURCES } from "@/lib/historical-sheets";
import {
  decryptSpotifyRefreshToken,
  encryptSpotifyRefreshToken,
  refreshSpotifyUserToken,
} from "@/lib/spotify-token";
import type {
  HistoricalImportAppearance as Appearance,
  HistoricalImportEdition as Edition,
  HistoricalImportLogLevel,
  HistoricalImportOptions,
  HistoricalImportProgressEvent,
  HistoricalImportResult,
  ImportedScoreEntry as ScoreEntry,
  ImportedSpotifyTrack as SpotifyTrack,
  ParticipantColumn,
  ParticipantHeaderColumn,
  SpotifyPlaylistPage,
  Tier,
} from "@/types";
import { normalizeSongTitle, songTitleMatchKey } from "./song-title-matching";

const TIER_HEADER = /^([SABCDF])\s+Tier\b/i;
// Google exports slash-containing tab names as digits because Excel forbids `/` in sheet names.
const EXPORTED_EDITION_TAB = /^\d{2,4}$/;
const NON_PARTICIPANT_HEADERS = [
  "progress",
  "#error!",
  "totals",
  "top 5",
  "me defending",
];
const INSERT_CHUNK_SIZE = 250;
const TIERS: Tier[] = ["S", "A", "B", "C", "D", "F"];
const CURRENT_PLAYLIST_ID = "5b4hdpNWm9Nu1Y5i7w5eKY";

type ReportProgress = (
  message: string,
  progress: number,
  level?: HistoricalImportLogLevel,
) => void;

function createProgressReporter(
  onProgress?: HistoricalImportOptions["onProgress"],
): ReportProgress {
  return (message, progress, level = "info") => {
    const event: HistoricalImportProgressEvent = {
      type: "progress",
      progress: Math.max(0, Math.min(100, Math.round(progress))),
      message,
      level,
      timestamp: new Date().toISOString(),
    };
    if (level === "warning") console.warn(message);
    else console.log(message);
    onProgress?.(event);
  };
}

const normalize = normalizeSongTitle;

function stableId(prefix: string, value: string) {
  return `${prefix}_${createHash("sha256").update(value).digest("hex")}`;
}

function tabLabel(date: Date) {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function exportedTabLabels(tabName: string) {
  const labels: string[] = [];
  for (let split = 1; split < tabName.length; split += 1) {
    const month = Number(tabName.slice(0, split));
    const day = Number(tabName.slice(split));
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31)
      labels.push(`${month}/${day}`);
  }
  return labels;
}

function inferDate(tabName: string, onOrBefore: Date) {
  const labels = exportedTabLabels(tabName);
  const cursor = new Date(onOrBefore);
  for (let offset = 0; offset <= 370; offset += 1) {
    if (labels.includes(tabLabel(cursor))) return new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  throw new Error(`Could not infer a date for exported worksheet ${tabName}.`);
}

function isParticipantHeader(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  const header = normalize(value);
  return !NON_PARTICIPANT_HEADERS.some((nonParticipant) =>
    header.includes(nonParticipant),
  );
}

function parseWorksheet(rows: unknown[][]): Appearance[] {
  const headerRow: unknown[] = rows[0] ?? [];
  const participantSectionEnd: number = headerRow.findIndex(
    (value, index) =>
      index > 0 &&
      typeof value === "string" &&
      NON_PARTICIPANT_HEADERS.some((header) =>
        normalize(value).includes(header),
      ),
  );
  const participantColumns = headerRow
    .map((value, sourceColumnIndex) => ({ value, sourceColumnIndex }))
    .filter(
      (column): column is { value: string; sourceColumnIndex: number } =>
        column.sourceColumnIndex > 0 &&
        (participantSectionEnd === -1 ||
          column.sourceColumnIndex < participantSectionEnd) &&
        isParticipantHeader(column.value),
    );
  const appearances: Appearance[] = [];
  let activeTier: Tier | undefined;

  rows.forEach((row, sourceRowIndex) => {
    const firstCell = typeof row[0] === "string" ? row[0].trim() : "";
    const tierMatch = firstCell.match(TIER_HEADER);
    if (tierMatch) {
      const tierLabel = tierMatch[1];
      if (tierLabel) activeTier = tierLabel.toUpperCase() as Tier;
    }
    if (firstCell === "Total") {
      activeTier = undefined;
      return;
    }
    if (!activeTier) return;
    const tier = activeTier;

    participantColumns.forEach(
      ({ value: participantName, sourceColumnIndex }) => {
        const songTitle = row[sourceColumnIndex];
        if (typeof songTitle !== "string" || !songTitle.trim()) return;
        appearances.push({
          songTitle: songTitle.trim(),
          participantName: participantName.trim(),
          tier,
          sourceRowIndex,
          sourceColumnIndex,
        });
      },
    );
  });
  return appearances;
}

function parseScoreLedger(rows: unknown[][]): ScoreEntry[] {
  const headerRow: unknown[] = rows[0] ?? [];
  const participantSectionEnd: number = headerRow.findIndex(
    (value, index) =>
      index > 0 &&
      typeof value === "string" &&
      NON_PARTICIPANT_HEADERS.some((header) =>
        normalize(value).includes(header),
      ),
  );
  const participantColumns: ParticipantColumn[] = headerRow
    .map((value, index) => ({ value, index }))
    .filter(
      (column): column is ParticipantHeaderColumn =>
        column.index > 0 &&
        (participantSectionEnd === -1 ||
          column.index < participantSectionEnd) &&
        isParticipantHeader(column.value),
    )
    .map((column) => ({ name: column.value.trim(), index: column.index }));
  const rowByLabel = (label: string): unknown[] | undefined =>
    rows.find((row) => typeof row[0] === "string" && row[0].trim() === label);
  const pointsRow: unknown[] | undefined = rowByLabel("Points");
  const changeRow: unknown[] | undefined = rowByLabel("Diff");
  const songsRow: unknown[] | undefined = rowByLabel("Songs");
  if (!pointsRow || !changeRow || !songsRow) return [];

  const pickHeaderRowIndex: number = rows.findIndex((row) =>
    row.some((value) => value === "Pick Order"),
  );
  const pickColumnIndex: number =
    pickHeaderRowIndex === -1
      ? -1
      : (rows[pickHeaderRowIndex]?.findIndex(
          (value) => value === "Pick Order",
        ) ?? -1);
  const ranks: Map<string, number> = new Map();
  if (pickColumnIndex !== -1) {
    for (const row of rows.slice(pickHeaderRowIndex + 1)) {
      const rank: number = Number(row[pickColumnIndex]);
      const label: unknown = row[pickColumnIndex + 1];
      if (!Number.isFinite(rank) || typeof label !== "string") continue;
      const name: string = label.split(" [")[0]?.trim() ?? "";
      if (name) ranks.set(normalize(name), rank);
    }
  }

  const scores: ScoreEntry[] = participantColumns.map(({ name, index }) => {
    const points: number = Number(pointsRow[index]) || 0;
    const songs: number = Number(songsRow[index]) || 0;
    return {
      name,
      points,
      change: Number(changeRow[index]) || 0,
      songs,
      average: songs ? points / songs : 0,
      rank: ranks.get(normalize(name)) ?? Number.MAX_SAFE_INTEGER,
    };
  });
  return scores
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        right.points - left.points ||
        left.name.localeCompare(right.name),
    )
    .map((score, index) => ({ ...score, rank: index + 1 }));
}

async function fetchWorkbook(spreadsheetId: string, title: string) {
  const response = await fetch(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`,
  );
  if (!response.ok) {
    throw new Error(
      `Google Sheets could not download "${title}" (${response.status} ${response.statusText}). No database records were changed.`,
    );
  }
  return XLSX.read(await response.arrayBuffer(), {
    type: "array",
    cellText: false,
  });
}

async function fetchLiveWorksheet(
  spreadsheetId: string,
  gid: string,
  title: string,
  tabName: string,
) {
  const response = await fetch(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
  );
  if (!response.ok)
    throw new Error(
      `Google Sheets could not download the live ${tabName} worksheet from "${title}" (${response.status} ${response.statusText}). No database records were changed.`,
    );
  const workbook = XLSX.read(await response.text(), { type: "string" });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet)
    throw new Error(
      `The live ${tabName} worksheet from "${title}" downloaded, but its rows could not be read. No database records were changed.`,
    );
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
}

function tierCounts(appearances: Appearance[]) {
  return Object.fromEntries(
    TIERS.map((tier) => [
      tier,
      appearances.filter((appearance) => appearance.tier === tier).length,
    ]),
  ) as Record<Tier, number>;
}

type SpotifyRefreshCredential = {
  userId: string | null;
  refreshToken: string;
};

async function fetchCurrentPlaylist(
  report: ReportProgress,
  credentials: SpotifyRefreshCredential[],
  saveRotatedToken: (userId: string, refreshToken: string) => Promise<void>,
) {
  if (!credentials.length) {
    report(
      "Skipped Spotify resolution: no playlist-capable Spotify account is linked. Link Spotify as the playlist owner or a collaborator.",
      54,
      "warning",
    );
    return [];
  }

  let lastStatus: number | null = null;
  for (const credential of credentials) {
    const token = await refreshSpotifyUserToken(credential.refreshToken);
    if (!token) continue;
    if (credential.userId && token.refresh_token) {
      await saveRotatedToken(credential.userId, token.refresh_token);
    }

    const tracks: SpotifyTrack[] = [];
    let nextUrl: string | null =
      `https://api.spotify.com/v1/playlists/${CURRENT_PLAYLIST_ID}/items?limit=50&market=US`;
    let canReadPlaylist: boolean = true;
    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (!response.ok) {
        lastStatus = response.status;
        canReadPlaylist = false;
        break;
      }
      const page: SpotifyPlaylistPage =
        (await response.json()) as SpotifyPlaylistPage;
      for (const entry of page.items) {
        const track = entry.item ?? entry.track;
        if (!track?.id || !track.name) continue;
        tracks.push({
          id: track.id,
          name: track.name,
          artistName:
            track.artists?.map((artist) => artist.name).join(", ") ?? "",
        });
      }
      nextUrl = page.next;
    }
    if (canReadPlaylist) return tracks;
  }

  report(
    `Skipped Spotify resolution: no linked Spotify account could read the playlist${lastStatus ? ` (last response ${lastStatus})` : ""}. Re-link Spotify as the playlist owner or a collaborator.`,
    54,
    "warning",
  );
  return [];
}

function uniqueSpotifyMatches(tracks: SpotifyTrack[]) {
  const tracksByTitle = new Map<string, SpotifyTrack[]>();
  for (const track of tracks) {
    const key = songTitleMatchKey(track.name);
    const matches = tracksByTitle.get(key);
    if (matches) matches.push(track);
    else tracksByTitle.set(key, [track]);
  }

  const uniqueMatches = new Map<string, SpotifyTrack>();
  for (const [title, matches] of tracksByTitle) {
    if (new Set(matches.map((track) => track.id)).size === 1) {
      uniqueMatches.set(title, matches[0]!);
    }
  }
  return uniqueMatches;
}

async function parseAllEditions(report: ReportProgress) {
  const editions: Edition[] = [];
  for (const [sourceIndex, source] of HISTORICAL_SHEET_SOURCES.entries()) {
    const sourceStartProgress =
      5 + (sourceIndex / HISTORICAL_SHEET_SOURCES.length) * 40;
    report(
      `Downloading workbook ${sourceIndex + 1} of ${HISTORICAL_SHEET_SOURCES.length}: ${source.title}.`,
      sourceStartProgress,
    );
    const workbook = await fetchWorkbook(source.id, source.title);
    const tabs = workbook.SheetNames.filter((name) =>
      EXPORTED_EDITION_TAB.test(name),
    );
    report(
      `Downloaded ${source.title}; found ${tabs.length} historical worksheets to read.`,
      sourceStartProgress + 2,
    );
    let upperBound = new Date(`${source.latestEditionDate}T00:00:00.000Z`);
    const latestTabName = tabLabel(upperBound);

    for (const [sourceTabIndex, exportedTabName] of tabs.entries()) {
      const editionDate = inferDate(exportedTabName, upperBound);
      const sourceTabName = tabLabel(editionDate);
      upperBound = new Date(editionDate);
      upperBound.setUTCDate(upperBound.getUTCDate() - 1);
      const sheet = workbook.Sheets[exportedTabName];
      if (!sheet) throw new Error(`Missing worksheet ${exportedTabName}.`);

      let rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
      });
      if (sourceTabName === latestTabName && source.latestSheetGid) {
        report(
          `Reading the live ${sourceTabName} worksheet from ${source.title} so the newest tier list is not taken from a stale workbook export.`,
          sourceStartProgress + 3,
        );
        rows = await fetchLiveWorksheet(
          source.id,
          source.latestSheetGid,
          source.title,
          sourceTabName,
        );
      }
      const appearances = parseWorksheet(rows);
      if (sourceTabName === latestTabName) {
        const actualCounts = tierCounts(appearances);
        report(
          `Read the newest ${sourceTabName} tier list: ${appearances.length} songs across ${TIERS.map((tier) => `${tier} ${actualCounts[tier]}`).join(", ")}. Changes to both the song total and tier assignments are expected and do not block the import.`,
          sourceStartProgress + 4,
          "success",
        );
      }
      if (!appearances.length) {
        report(
          `Skipped ${source.title}, worksheet ${sourceTabName}, because it contained no tier placements.`,
          sourceStartProgress + 4,
          "warning",
        );
        continue;
      }
      editions.push({
        id: stableId("edition", `${source.id}\0${sourceTabName}`),
        sourceSpreadsheetId: source.id,
        sourceTabName,
        sourceTabIndex,
        editionDate: dateString(editionDate),
        isCanonical: false,
        appearances,
        scores: parseScoreLedger(rows),
      });
    }
    report(
      `Finished ${source.title}: read ${tabs.length} worksheet snapshots.`,
      5 + ((sourceIndex + 1) / HISTORICAL_SHEET_SOURCES.length) * 40,
      "success",
    );
  }

  const sourcePriority = new Map(
    HISTORICAL_SHEET_SOURCES.map((source) => [source.id, source.priority]),
  );
  const canonicalByDate = new Map<string, Edition>();
  for (const edition of editions) {
    const priority = sourcePriority.get(edition.sourceSpreadsheetId) ?? 0;
    const current = canonicalByDate.get(edition.editionDate);
    const currentPriority = current
      ? (sourcePriority.get(current.sourceSpreadsheetId) ?? 0)
      : -1;
    if (priority > currentPriority)
      canonicalByDate.set(edition.editionDate, edition);
  }
  canonicalByDate.forEach((edition) => {
    edition.isCanonical = true;
  });
  return editions;
}

function chunk<T>(items: T[], size = INSERT_CHUNK_SIZE) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

export async function runHistoricalImport(
  options: HistoricalImportOptions = {},
): Promise<HistoricalImportResult> {
  loadEnvConfig(process.cwd());
  const report = createProgressReporter(options.onProgress);
  report("Starting the historical sheet re-import.", 1);
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl)
    throw new Error(
      "The import cannot connect to the database because DATABASE_URL is not configured.",
    );

  const db = getDb();
  const editions = await parseAllEditions(report);
  report(
    `Finished reading Google Sheets: ${editions.length} source snapshots are ready to save.`,
    48,
    "success",
  );
  const latestCanonicalEdition = editions
    .filter((edition) => edition.isCanonical)
    .sort((left, right) =>
      right.editionDate.localeCompare(left.editionDate),
    )[0];
  if (latestCanonicalEdition?.scores.length) {
    report("Updating the leaderboard from the newest score ledger.", 51);
    await db
      .insert(appSettings)
      .values({
        key: "leaderboard_data",
        value: JSON.stringify({
          editionDate: latestCanonicalEdition.editionDate,
          entries: latestCanonicalEdition.scores,
        }),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: JSON.stringify({
            editionDate: latestCanonicalEdition.editionDate,
            entries: latestCanonicalEdition.scores,
          }),
          updatedAt: new Date(),
        },
      });
  }
  const currentTitleCounts = new Map<string, number>();
  for (const appearance of latestCanonicalEdition?.appearances ?? []) {
    const key = songTitleMatchKey(appearance.songTitle);
    currentTitleCounts.set(key, (currentTitleCounts.get(key) ?? 0) + 1);
  }
  report("Checking the current Spotify playlist for exact title matches.", 54);
  const storedSpotifyCredentials = await db
    .select({
      userId: appUsers.id,
      ciphertext: appUsers.spotifyRefreshTokenCiphertext,
    })
    .from(appUsers)
    .where(isNotNull(appUsers.spotifyRefreshTokenCiphertext));
  const spotifyCredentials: SpotifyRefreshCredential[] = [];
  for (const credential of storedSpotifyCredentials) {
    if (!credential.ciphertext) continue;
    try {
      spotifyCredentials.push({
        userId: credential.userId,
        refreshToken: decryptSpotifyRefreshToken(credential.ciphertext),
      });
    } catch {
      // Ignore unreadable legacy credentials and allow another linked account.
    }
  }
  const environmentRefreshToken = process.env["SPOTIFY_REFRESH_TOKEN"];
  if (
    environmentRefreshToken &&
    !spotifyCredentials.some(
      (credential) => credential.refreshToken === environmentRefreshToken,
    )
  ) {
    spotifyCredentials.push({
      userId: null,
      refreshToken: environmentRefreshToken,
    });
  }
  const playlistTracks = await fetchCurrentPlaylist(
    report,
    spotifyCredentials,
    async (userId, refreshToken) => {
      await db
        .update(appUsers)
        .set({
          spotifyRefreshTokenCiphertext:
            encryptSpotifyRefreshToken(refreshToken),
          updatedAt: new Date(),
        })
        .where(eq(appUsers.id, userId));
    },
  );
  const spotifyMatches = uniqueSpotifyMatches(playlistTracks);
  const allAppearances = editions.flatMap((edition) => edition.appearances);
  const participantRows = [
    ...new Map(
      allAppearances.map((appearance) => {
        const normalizedName = normalize(appearance.participantName);
        return [
          normalizedName,
          {
            id: stableId("participant", normalizedName),
            displayName: appearance.participantName,
            normalizedName,
          },
        ];
      }),
    ).values(),
  ];
  const songRows = [
    ...new Map(
      allAppearances.map((appearance) => {
        const normalizedTitle = normalize(appearance.songTitle);
        const matchKey: string = songTitleMatchKey(normalizedTitle);
        const spotifyMatch =
          currentTitleCounts.get(matchKey) === 1
            ? spotifyMatches.get(matchKey)
            : undefined;
        return [
          normalizedTitle,
          {
            id: stableId("song", normalizedTitle),
            title: appearance.songTitle,
            normalizedTitle,
            artistName: spotifyMatch?.artistName || null,
            spotifyTrackId: spotifyMatch?.id ?? null,
          },
        ];
      }),
    ).values(),
  ];

  report("Saving workbook sources to the database.", 60);
  for (const source of HISTORICAL_SHEET_SOURCES) {
    await db
      .insert(sourceSpreadsheets)
      .values({
        googleSpreadsheetId: source.id,
        title: source.title,
        sourcePriority: source.priority,
      })
      .onConflictDoUpdate({
        target: sourceSpreadsheets.googleSpreadsheetId,
        set: {
          title: source.title,
          sourcePriority: source.priority,
          updatedAt: new Date(),
        },
      });
  }
  report(`Saving ${participantRows.length} participants.`, 64);
  for (const values of chunk(participantRows))
    await db.insert(participants).values(values).onConflictDoNothing();
  report(`Saving ${songRows.length} unique song titles.`, 68);
  for (const values of chunk(songRows))
    await db.insert(songs).values(values).onConflictDoNothing();
  const resolvedSongRows = songRows.filter((row) => row.spotifyTrackId);
  report(
    `Preserving existing Spotify links and adding ${resolvedSongRows.length} safe exact-title matches.`,
    72,
  );
  for (const row of resolvedSongRows) {
    await db
      .update(songs)
      .set({
        artistName: row.artistName,
        spotifyTrackId: row.spotifyTrackId,
      })
      .where(
        and(
          eq(songs.normalizedTitle, row.normalizedTitle),
          isNull(songs.spotifyTrackId),
        ),
      );
  }
  if (playlistTracks.length) {
    report(
      `Resolved ${resolvedSongRows.length} current titles from ${playlistTracks.length} Spotify playlist tracks.`,
      75,
      "success",
    );
  }
  const editionRows = editions.map((edition) => ({
    id: edition.id,
    sourceSpreadsheetId: edition.sourceSpreadsheetId,
    sourceTabName: edition.sourceTabName,
    sourceTabIndex: edition.sourceTabIndex,
    editionDate: edition.editionDate,
    isCanonical: edition.isCanonical,
  }));
  report(`Saving ${editionRows.length} weekly edition snapshots.`, 78);
  for (const values of chunk(editionRows)) {
    await db
      .insert(weeklyEditions)
      .values(values)
      .onConflictDoUpdate({
        target: [
          weeklyEditions.sourceSpreadsheetId,
          weeklyEditions.sourceTabName,
        ],
        set: { importedAt: new Date() },
      });
  }
  const participantIds = new Map<string, string>();
  for (const normalizedNames of chunk(
    participantRows.map((row) => row.normalizedName),
  )) {
    const storedParticipants = await db
      .select({ id: participants.id, normalizedName: participants.normalizedName })
      .from(participants)
      .where(inArray(participants.normalizedName, normalizedNames));
    storedParticipants.forEach((row) => {
      participantIds.set(row.normalizedName, row.id);
    });
  }
  const songIds = new Map<string, string>();
  for (const normalizedTitles of chunk(
    songRows.map((row) => row.normalizedTitle),
  )) {
    const storedSongs = await db
      .select({ id: songs.id, normalizedTitle: songs.normalizedTitle })
      .from(songs)
      .where(inArray(songs.normalizedTitle, normalizedTitles));
    storedSongs.forEach((row) => {
      songIds.set(row.normalizedTitle, row.id);
    });
  }
  const missingParticipantCount = participantRows.filter(
    (row) => !participantIds.has(row.normalizedName),
  ).length;
  const missingSongCount = songRows.filter(
    (row) => !songIds.has(row.normalizedTitle),
  ).length;
  if (missingParticipantCount || missingSongCount) {
    throw new Error(
      `The database could not resolve ${missingParticipantCount} participants and ${missingSongCount} songs after saving them. Existing placements were not removed.`,
    );
  }
  const appearanceRows = editions.flatMap((edition) =>
    edition.appearances.map((appearance) => ({
      weeklyEditionId: edition.id,
      songId: songIds.get(normalize(appearance.songTitle))!,
      participantId: participantIds.get(normalize(appearance.participantName))!,
      tier: appearance.tier,
      sourceRowIndex: appearance.sourceRowIndex,
      sourceColumnIndex: appearance.sourceColumnIndex,
    })),
  );
  report("Removing the previous placements for these imported editions.", 82);
  for (const editionIds of chunk(editions.map((edition) => edition.id))) {
    await db
      .delete(songAppearances)
      .where(inArray(songAppearances.weeklyEditionId, editionIds));
  }
  const appearanceChunks = chunk(appearanceRows);
  for (const [chunkIndex, values] of appearanceChunks.entries()) {
    await db.insert(songAppearances).values(values);
    if (
      chunkIndex === appearanceChunks.length - 1 ||
      (chunkIndex + 1) % 20 === 0
    ) {
      report(
        `Saved ${Math.min((chunkIndex + 1) * INSERT_CHUNK_SIZE, appearanceRows.length).toLocaleString()} of ${appearanceRows.length.toLocaleString()} tier placements.`,
        84 + ((chunkIndex + 1) / appearanceChunks.length) * 11,
      );
    }
  }

  report("Marking the authoritative edition for each date.", 96);
  await db.update(weeklyEditions).set({ isCanonical: false });
  for (const ids of chunk(
    editions
      .filter((edition) => edition.isCanonical)
      .map((edition) => edition.id),
  )) {
    await db
      .update(weeklyEditions)
      .set({ isCanonical: true })
      .where(inArray(weeklyEditions.id, ids));
  }
  report(
    `Imported ${editions.length} source snapshots, ${participantRows.length} participants, ${songRows.length} title records, and ${appearanceRows.length} tier placements.`,
    100,
    "success",
  );
  return {
    sourceSnapshots: editions.length,
    participants: participantRows.length,
    titleRecords: songRows.length,
    tierPlacements: appearanceRows.length,
    resolvedSpotifyTitles: resolvedSongRows.length,
    playlistTracks: playlistTracks.length,
  };
}

const entrypoint: string = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (entrypoint.endsWith("/scripts/import-historical-sheets.ts")) {
  void runHistoricalImport().catch((error: unknown) => {
    const cause: unknown =
      error instanceof Error && "cause" in error ? error.cause : undefined;
    console.error(
      cause instanceof Error
        ? `Import stopped: ${cause.message}`
        : error instanceof Error
          ? `Import stopped: ${error.message}`
        : "Import stopped because of an unexpected error.",
    );
    process.exitCode = 1;
  });
}
