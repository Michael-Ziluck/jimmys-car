import "server-only";

import { randomUUID } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { appUsers, userSessions } from "@/db/schema";
import type {
  AppUser,
  DiscordProfile,
  SessionCookie,
  SessionIdentity,
} from "@/types";
import { discordAvatarUrl } from "@/lib/discord";

export const sessionCookieName: string = "jimmys_car_session";
const sessionDurationMs: number = 30 * 24 * 60 * 60 * 1000;

export async function upsertDiscordUser(
  profile: DiscordProfile,
): Promise<AppUser | undefined> {
  const db: ReturnType<typeof getDb> = getDb();
  const [user] = await db
    .insert(appUsers)
    .values({
      id: randomUUID(),
      discordId: profile.id,
      discordUsername: profile.username,
      discordDisplayName: profile.global_name,
      discordAvatar: discordAvatarUrl(profile),
    })
    .onConflictDoUpdate({
      target: appUsers.discordId,
      set: {
        discordUsername: profile.username,
        discordDisplayName: profile.global_name,
        discordAvatar: discordAvatarUrl(profile),
        updatedAt: new Date(),
      },
    })
    .returning();
  revalidatePath("/admin/users");
  return user;
}

export async function createSession(userId: string): Promise<SessionIdentity> {
  const id: `${string}-${string}-${string}-${string}-${string}` = randomUUID();
  const expiresAt: Date = new Date(Date.now() + sessionDurationMs);
  await getDb().insert(userSessions).values({ id, userId, expiresAt });
  return { id, expiresAt };
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const sessionId: string | undefined = (await cookies()).get(
    sessionCookieName,
  )?.value;
  if (!sessionId) return null;
  const db: ReturnType<typeof getDb> = getDb();
  const [result] = await db
    .select({ user: appUsers, sessionId: userSessions.id })
    .from(userSessions)
    .innerJoin(appUsers, eq(userSessions.userId, appUsers.id))
    .where(
      and(
        eq(userSessions.id, sessionId),
        gt(userSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return result?.user ?? null;
}

export function sessionCookie(value: string, expiresAt: Date): SessionCookie {
  return {
    name: sessionCookieName,
    value,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      path: "/",
    },
  };
}
