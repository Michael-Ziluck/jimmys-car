import "server-only";

import { randomUUID } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";

import { getDb } from "@/db";
import { appUsers, userSessions } from "@/db/schema";
import type { DiscordProfile } from "@/lib/discord";
import { discordAvatarUrl } from "@/lib/discord";

export const sessionCookieName: string = "jimmys_car_session";
const sessionDurationMs: number = 30 * 24 * 60 * 60 * 1000;

export async function upsertDiscordUser(profile: DiscordProfile) : Promise<{ id: string; discordId: string; discordUsername: string; discordDisplayName: string | null; discordAvatar: string | null; spotifyAccountId: string | null; spotifyDisplayName: string | null; spotifyImageUrl: string | null; createdAt: Date; claimedParticipantId: string | null; updatedAt: Date; } | undefined> {
  const db: ReturnType<typeof getDb> = getDb();
  const [user] = await db.insert(appUsers).values({
    id: randomUUID(),
    discordId: profile.id,
    discordUsername: profile.username,
    discordDisplayName: profile.global_name,
    discordAvatar: discordAvatarUrl(profile),
  }).onConflictDoUpdate({
    target: appUsers.discordId,
    set: { discordUsername: profile.username, discordDisplayName: profile.global_name, discordAvatar: discordAvatarUrl(profile), updatedAt: new Date() },
  }).returning();
  return user;
}

export async function createSession(userId: string) : Promise<{ id: `${string}-${string}-${string}-${string}-${string}`; expiresAt: Date; }> {
  const id: `${string}-${string}-${string}-${string}-${string}` = randomUUID();
  const expiresAt: Date = new Date(Date.now() + sessionDurationMs);
  await getDb().insert(userSessions).values({ id, userId, expiresAt });
  return { id, expiresAt };
}

export async function getCurrentUser() : Promise<{ id: string; discordId: string; discordUsername: string; discordDisplayName: string | null; discordAvatar: string | null; spotifyAccountId: string | null; spotifyDisplayName: string | null; spotifyImageUrl: string | null; claimedParticipantId: string | null; createdAt: Date; updatedAt: Date; } | null> {
  const sessionId: string | undefined = (await cookies()).get(sessionCookieName)?.value;
  if (!sessionId) return null;
  const db: ReturnType<typeof getDb> = getDb();
  const [result] = await db.select({ user: appUsers, sessionId: userSessions.id })
    .from(userSessions)
    .innerJoin(appUsers, eq(userSessions.userId, appUsers.id))
    .where(and(eq(userSessions.id, sessionId), gt(userSessions.expiresAt, new Date())))
    .limit(1);
  return result?.user ?? null;
}

export function sessionCookie(value: string, expiresAt: Date) : { name: string; value: string; options: { httpOnly: boolean; sameSite: "lax"; secure: boolean; expires: Date; path: string; }; } {
  return { name: sessionCookieName, value, options: { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", expires: expiresAt, path: "/" } };
}
