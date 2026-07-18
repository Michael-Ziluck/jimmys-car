import "server-only";

import { desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import {
  appSettings,
  participants,
  songAppearances,
  weeklyEditions,
} from "@/db/schema";
import type {
  EditionIdentity,
  Leaderboard,
  LeaderboardEntry,
  LeaderboardParticipant,
  ParticipantScore,
  ScoredAppearance,
} from "@/types";

const TIER_POINTS: Readonly<Record<"S" | "A" | "B" | "C" | "D" | "F", number>> =
  { S: 4, A: 2, B: 1, C: 0, D: -1, F: -3 };

function parseStoredLeaderboard(value: string): Leaderboard | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("editionDate" in parsed) ||
      !("entries" in parsed) ||
      typeof parsed.editionDate !== "string" ||
      !Array.isArray(parsed.entries)
    )
      return null;
    const entries: Array<LeaderboardEntry> = parsed.entries
      .filter((entry): entry is LeaderboardEntry =>
        Boolean(
          entry &&
          typeof entry.name === "string" &&
          typeof entry.points === "number" &&
          typeof entry.change === "number" &&
          typeof entry.songs === "number" &&
          typeof entry.average === "number" &&
          typeof entry.rank === "number",
        ),
      )
      .map((entry) => ({ ...entry, participantId: `sheet-${entry.name}` }));
    return {
      editionDate: parsed.editionDate,
      previousEditionDate: null,
      entries,
    };
  } catch {
    return null;
  }
}

function totalsByParticipant(
  appearances: Array<ScoredAppearance>,
  editionId: string,
): Map<string, ParticipantScore> {
  const totals: Map<string, ParticipantScore> = new Map();
  for (const appearance of appearances) {
    if (appearance.editionId !== editionId) continue;
    const current: ParticipantScore = totals.get(appearance.participantId) ?? {
      points: 0,
      songs: 0,
    };
    totals.set(appearance.participantId, {
      points: current.points + TIER_POINTS[appearance.tier],
      songs: current.songs + 1,
    });
  }
  return totals;
}

export async function getLeaderboard(): Promise<Leaderboard | null> {
  const db: ReturnType<typeof getDb> = getDb();
  const [stored] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, "leaderboard_data"))
    .limit(1);
  if (stored) {
    const leaderboard: Leaderboard | null = parseStoredLeaderboard(
      stored.value,
    );
    if (leaderboard) return leaderboard;
  }
  const editions: EditionIdentity[] = await db
    .select({ id: weeklyEditions.id, editionDate: weeklyEditions.editionDate })
    .from(weeklyEditions)
    .where(eq(weeklyEditions.isCanonical, true))
    .orderBy(desc(weeklyEditions.editionDate))
    .limit(2);
  const latest: EditionIdentity | undefined = editions[0];
  if (!latest) return null;

  const people: LeaderboardParticipant[] = await db
    .select({ id: participants.id, name: participants.displayName })
    .from(participants);
  const appearances: Array<ScoredAppearance> = await db
    .select({
      editionId: songAppearances.weeklyEditionId,
      participantId: songAppearances.participantId,
      tier: songAppearances.tier,
    })
    .from(songAppearances)
    .where(
      inArray(
        songAppearances.weeklyEditionId,
        editions.map((edition) => edition.id),
      ),
    );
  const latestTotals: Map<string, ParticipantScore> = totalsByParticipant(
    appearances,
    latest.id,
  );
  const previousTotals: Map<string, ParticipantScore> = editions[1]
    ? totalsByParticipant(appearances, editions[1].id)
    : new Map();

  const sorted: Array<Omit<LeaderboardEntry, "rank">> = people
    .map((person) => {
      const current: ParticipantScore = latestTotals.get(person.id) ?? {
        points: 0,
        songs: 0,
      };
      const previousPoints: number = previousTotals.get(person.id)?.points ?? 0;
      return {
        participantId: person.id,
        name: person.name,
        points: current.points,
        change: current.points - previousPoints,
        songs: current.songs,
        average: current.songs ? current.points / current.songs : 0,
      };
    })
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.average - left.average ||
        left.name.localeCompare(right.name),
    );

  return {
    editionDate: latest.editionDate,
    previousEditionDate: editions[1]?.editionDate ?? null,
    entries: sorted.map((entry, index) => ({ ...entry, rank: index + 1 })),
  };
}
