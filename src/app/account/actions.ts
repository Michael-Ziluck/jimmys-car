"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { appUsers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import type { AppUser } from "@/types";

export async function claimParticipant(participantId: string): Promise<void> {
  const user: AppUser | null = await getCurrentUser();
  if (!user) redirect("/account?error=sign_in_required");
  if (user.claimedParticipantId)
    redirect("/account?claim_error=already_claimed");
  const db: ReturnType<typeof getDb> = getDb();
  const [alreadyClaimed] = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(eq(appUsers.claimedParticipantId, participantId))
    .limit(1);
  if (alreadyClaimed) redirect("/account?claim_error=already_claimed");
  await db
    .update(appUsers)
    .set({ claimedParticipantId: participantId, updatedAt: new Date() })
    .where(eq(appUsers.id, user.id));
  revalidatePath("/account");
  redirect("/account?claimed=1");
}

export async function disconnectSpotify(): Promise<void> {
  const user: AppUser | null = await getCurrentUser();
  if (!user) redirect("/account?error=sign_in_required");
  await getDb()
    .update(appUsers)
    .set({
      spotifyAccountId: null,
      spotifyDisplayName: null,
      spotifyImageUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(appUsers.id, user.id));
  revalidatePath("/account");
  redirect("/account?spotify_disconnected=1");
}
