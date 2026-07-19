import { asc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { appUsers, participants } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import type {
  AccountUpdateRequest,
  AppUser,
  ParticipantIdentity,
} from "@/types";

export async function GET(): Promise<Response> {
  const user: AppUser | null = await getCurrentUser();
  if (!user) return Response.json({ user: null });

  const db: ReturnType<typeof getDb> = getDb();
  const claimedParticipant: Array<Pick<ParticipantIdentity, "displayName">> =
    user.claimedParticipantId
      ? await db
          .select({ displayName: participants.displayName })
          .from(participants)
          .where(eq(participants.id, user.claimedParticipantId))
          .limit(1)
      : [];
  const claimableParticipants: ParticipantIdentity[] = user.claimedParticipantId
    ? []
    : await db
        .select({
          id: participants.id,
          displayName: participants.displayName,
        })
        .from(participants)
        .leftJoin(appUsers, eq(appUsers.claimedParticipantId, participants.id))
        .where(isNull(appUsers.id))
        .orderBy(asc(participants.displayName));

  return Response.json({
    user: {
      discordUsername: user.discordUsername,
      discordDisplayName: user.discordDisplayName,
      spotifyAccountId: user.spotifyAccountId,
      spotifyDisplayName: user.spotifyDisplayName,
      songView: user.songView,
    },
    claimedParticipant: claimedParticipant[0] ?? null,
    claimableParticipants,
  });
}

export async function PATCH(request: Request): Promise<Response> {
  const user: AppUser | null = await getCurrentUser();
  if (!user)
    return Response.json({ error: "Sign in required." }, { status: 401 });
  const body: AccountUpdateRequest =
    (await request.json()) as AccountUpdateRequest;
  const db: ReturnType<typeof getDb> = getDb();

  if (body.action === "disconnect-spotify") {
    await db
      .update(appUsers)
      .set({
        spotifyAccountId: null,
        spotifyDisplayName: null,
        spotifyImageUrl: null,
        spotifyRefreshTokenCiphertext: null,
        updatedAt: new Date(),
      })
      .where(eq(appUsers.id, user.id));
    return Response.json({ ok: true });
  }
  if (
    body.action === "set-song-view" &&
    (body.songView === "cards" || body.songView === "list")
  ) {
    await db
      .update(appUsers)
      .set({ songView: body.songView, updatedAt: new Date() })
      .where(eq(appUsers.id, user.id));
    return Response.json({ ok: true, songView: body.songView });
  }
  if (
    body.action === "claim" &&
    body.participantId &&
    !user.claimedParticipantId
  ) {
    const [alreadyClaimed] = await db
      .select({ id: appUsers.id })
      .from(appUsers)
      .where(eq(appUsers.claimedParticipantId, body.participantId))
      .limit(1);
    if (alreadyClaimed)
      return Response.json(
        { error: "That profile has already been claimed." },
        { status: 409 },
      );
    await db
      .update(appUsers)
      .set({ claimedParticipantId: body.participantId, updatedAt: new Date() })
      .where(eq(appUsers.id, user.id));
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Invalid account update." }, { status: 400 });
}
