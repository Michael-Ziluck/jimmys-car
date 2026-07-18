import { createHash } from "node:crypto";

import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as XLSX from "xlsx";

import {
  appSettings,
  participants,
  songAppearances,
  songs,
  sourceSpreadsheets,
  weeklyEditions,
} from "@/db/schema";
import { HISTORICAL_SHEET_SOURCES } from "@/lib/historical-sheets";
import type {
  HistoricalImportAppearance as Appearance,
  HistoricalImportEdition as Edition,
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

function normalize(value: string) {
  return normalizeSongTitle(value);
}

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

async function fetchWorkbook(spreadsheetId: string) {
  const response = await fetch(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`,
  );
  if (!response.ok) {
    throw new Error(
      `Could not download ${spreadsheetId}: ${response.status} ${response.statusText}`,
    );
  }
  return XLSX.read(await response.arrayBuffer(), {
    type: "array",
    cellText: false,
  });
}

async function fetchLiveWorksheet(spreadsheetId: string, gid: string) {
  const response = await fetch(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
  );
  if (!response.ok)
    throw new Error(`Could not download live worksheet ${gid}.`);
  const workbook = XLSX.read(await response.text(), { type: "string" });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new Error(`Could not parse live worksheet ${gid}.`);
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

async function getSpotifyAccessToken() {
  const clientId = process.env["SPOTIFY_CLIENT_ID"];
  const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];
  if (!clientId || !clientSecret) return undefined;

  const refreshToken = process.env["SPOTIFY_REFRESH_TOKEN"];
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(
      refreshToken
        ? { grant_type: "refresh_token", refresh_token: refreshToken }
        : { grant_type: "client_credentials" },
    ),
  });
  if (!response.ok) return undefined;
  return ((await response.json()) as { access_token: string }).access_token;
}

async function fetchCurrentPlaylist() {
  const accessToken = await getSpotifyAccessToken();
  if (!accessToken) {
    console.warn(
      "Skipped Spotify resolution: Spotify credentials are not configured or could not be refreshed.",
    );
    return [];
  }

  const tracks: SpotifyTrack[] = [];
  let nextUrl: string | null =
    `https://api.spotify.com/v1/playlists/${CURRENT_PLAYLIST_ID}/items?limit=50&market=US`;
  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      console.warn(
        `Skipped Spotify resolution: playlist access returned ${response.status}. ` +
          "Set SPOTIFY_REFRESH_TOKEN from the playlist owner or a collaborator.",
      );
      return [];
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
  return tracks;
}

function uniqueSpotifyMatches(tracks: SpotifyTrack[]) {
  const grouped = new Map<string, SpotifyTrack[]>();
  for (const track of tracks) {
    const key = songTitleMatchKey(track.name);
    grouped.set(key, [...(grouped.get(key) ?? []), track]);
  }
  return new Map(
    [...grouped].flatMap(([key, matches]) =>
      new Map(matches.map((track) => [track.id, track])).size === 1
        ? [[key, matches[0]] as const]
        : [],
    ),
  );
}

async function parseAllEditions() {
  const editions: Edition[] = [];
  for (const source of HISTORICAL_SHEET_SOURCES) {
    console.log(`Downloading ${source.title}…`);
    const workbook = await fetchWorkbook(source.id);
    const tabs = workbook.SheetNames.filter((name) =>
      EXPORTED_EDITION_TAB.test(name),
    );
    let upperBound = new Date(`${source.latestEditionDate}T00:00:00.000Z`);

    for (const [sourceTabIndex, exportedTabName] of tabs.entries()) {
      const editionDate = inferDate(exportedTabName, upperBound);
      const sourceTabName = tabLabel(editionDate);
      upperBound = new Date(editionDate);
      upperBound.setUTCDate(upperBound.getUTCDate() - 1);
      const rows =
        sourceTabName === "7/19" && "latestSheetGid" in source
          ? await fetchLiveWorksheet(source.id, source.latestSheetGid)
          : XLSX.utils.sheet_to_json<unknown[]>(
              workbook.Sheets[exportedTabName] ??
                (() => {
                  throw new Error(`Missing worksheet ${exportedTabName}.`);
                })(),
              {
                header: 1,
                defval: "",
                raw: false,
              },
            );
      const appearances = parseWorksheet(rows);
      const expectedTierCounts = source.latestExpectedTierCounts;
      if (
        expectedTierCounts &&
        sourceTabName ===
          tabLabel(new Date(`${source.latestEditionDate}T00:00:00.000Z`))
      ) {
        const actualCounts = tierCounts(appearances);
        const mismatches = TIERS.filter(
          (tier) => actualCounts[tier] !== expectedTierCounts[tier],
        );
        if (mismatches.length) {
          throw new Error(
            `${source.title} / ${sourceTabName} tier validation failed: expected ${JSON.stringify(expectedTierCounts)}, received ${JSON.stringify(actualCounts)}.`,
          );
        }
        console.log(
          `Validated ${source.title} / ${sourceTabName}: ${TIERS.map((tier) => `${tier}=${actualCounts[tier]}`).join(", ")} (${appearances.length} placements).`,
        );
      }
      if (!appearances.length) {
        console.warn(
          `Skipped ${source.title} / ${sourceTabName}: no tier placements found.`,
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
  }

  const canonicalByDate = new Map<string, Edition>();
  for (const edition of editions) {
    const priority = HISTORICAL_SHEET_SOURCES.find(
      (source) => source.id === edition.sourceSpreadsheetId,
    )!.priority;
    const current = canonicalByDate.get(edition.editionDate);
    const currentPriority = current
      ? HISTORICAL_SHEET_SOURCES.find(
          (source) => source.id === current.sourceSpreadsheetId,
        )!.priority
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

async function main() {
  loadEnvConfig(process.cwd());
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl)
    throw new Error("DATABASE_URL is required to import historical sheets.");

  const db = drizzle({ client: neon(databaseUrl) });
  const editions = await parseAllEditions();
  const latestCanonicalEdition = editions
    .filter((edition) => edition.isCanonical)
    .sort((left, right) =>
      right.editionDate.localeCompare(left.editionDate),
    )[0];
  if (latestCanonicalEdition?.scores.length) {
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
  const currentTitleCounts: Map<string, number> = new Map();
  const currentTitles: Set<string> = new Set(
    latestCanonicalEdition?.appearances.map((appearance) =>
      normalize(appearance.songTitle),
    ) ?? [],
  );
  for (const title of currentTitles) {
    const key: string = songTitleMatchKey(title);
    currentTitleCounts.set(key, (currentTitleCounts.get(key) ?? 0) + 1);
  }
  const playlistTracks = await fetchCurrentPlaylist();
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
  for (const values of chunk(participantRows))
    await db.insert(participants).values(values).onConflictDoNothing();
  for (const values of chunk(songRows))
    await db.insert(songs).values(values).onConflictDoNothing();
  const resolvedSongRows = songRows.filter((row) => row.spotifyTrackId);
  for (const row of resolvedSongRows) {
    await db
      .update(songs)
      .set({
        artistName: row.artistName,
        spotifyTrackId: row.spotifyTrackId,
      })
      .where(and(eq(songs.id, row.id), isNull(songs.spotifyTrackId)));
  }
  if (playlistTracks.length) {
    console.log(
      `Resolved ${resolvedSongRows.length} current titles from ${playlistTracks.length} Spotify playlist tracks.`,
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
  for (const editionIds of chunk(editions.map((edition) => edition.id))) {
    await db
      .delete(songAppearances)
      .where(inArray(songAppearances.weeklyEditionId, editionIds));
  }

  const participantIds = new Map(
    participantRows.map((row) => [row.normalizedName, row.id]),
  );
  const songIds = new Map(songRows.map((row) => [row.normalizedTitle, row.id]));
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
  for (const values of chunk(appearanceRows))
    await db.insert(songAppearances).values(values);

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
  console.log(
    `Imported ${editions.length} source snapshots, ${participantRows.length} participants, ${songRows.length} title records, and ${appearanceRows.length} tier placements.`,
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
