import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { appUsers, participants } from "@/db/schema";
import {
  exchangeSpotifyCode,
  getSpotifyProfile,
  getSpotifyRedirectUri,
} from "@/lib/spotify";
import { encryptSpotifyRefreshToken } from "@/lib/spotify-token";
import { setErrorFlash, setSuccessFlash } from "@/lib/flash";
import type { AppUser, SpotifyProfile, SpotifyTokenResponse } from "@/types";
import { stateCookieName } from "../route";

export async function GET(request: Request): Promise<NextResponse<unknown>> {
  const accountUrl: URL = new URL(
    "/account",
    new URL(getSpotifyRedirectUri()).origin,
  );
  const requestUrl: URL = new URL(request.url);
  const spotifyError: string | null = requestUrl.searchParams.get("error");
  const code: string | null = requestUrl.searchParams.get("code");
  const state: string | null = requestUrl.searchParams.get("state");
  const cookieStore: Awaited<ReturnType<typeof cookies>> = await cookies();
  const expectedState: string | undefined =
    cookieStore.get(stateCookieName)?.value;

  if (spotifyError || !code || !state || state !== expectedState) {
    const reason: string = spotifyError ?? "invalid_state";
    const response: NextResponse<unknown> = NextResponse.redirect(accountUrl);
    response.cookies.delete(stateCookieName);
    setErrorFlash(
      response,
      reason === "access_denied"
        ? "Spotify linking was cancelled."
        : "Spotify could not be linked. Please try again.",
    );
    return response;
  }

  try {
    const user: AppUser | null = await getCurrentUser();
    if (!user) {
      const response: NextResponse<unknown> = NextResponse.redirect(accountUrl);
      response.cookies.delete(stateCookieName);
      setErrorFlash(response, "Sign in with Discord before linking Spotify.");
      return response;
    }
    const token: SpotifyTokenResponse = await exchangeSpotifyCode(code);
    if (!token.refresh_token) {
      throw new Error("Spotify did not return a refresh token.");
    }
    const profile: SpotifyProfile = await getSpotifyProfile(token.access_token);
    const spotifyAccountId: string = profile.account_id ?? profile.id;
    const [linkedUser] = await getDb()
      .select({ id: appUsers.id })
      .from(appUsers)
      .where(eq(appUsers.spotifyAccountId, spotifyAccountId))
      .limit(1);
    if (linkedUser && linkedUser.id !== user.id) {
      const response: NextResponse<unknown> = NextResponse.redirect(accountUrl);
      response.cookies.delete(stateCookieName);
      setErrorFlash(
        response,
        "That Spotify profile is already linked to another Jimmy’s Car account.",
      );
      return response;
    }
    const [assignedParticipant] = await getDb()
      .select({ id: participants.id })
      .from(participants)
      .where(eq(participants.spotifyAccountId, spotifyAccountId))
      .limit(1);
    await getDb()
      .update(appUsers)
      .set({
        spotifyAccountId,
        spotifyDisplayName: profile.display_name,
        spotifyImageUrl: profile.images[0]?.url ?? null,
        spotifyRefreshTokenCiphertext: encryptSpotifyRefreshToken(
          token.refresh_token,
        ),
        claimedParticipantId:
          user.claimedParticipantId ?? assignedParticipant?.id ?? null,
        updatedAt: new Date(),
      })
      .where(eq(appUsers.id, user.id));
    const response: NextResponse<unknown> = NextResponse.redirect(accountUrl);

    response.cookies.delete(stateCookieName);
    setSuccessFlash(response, "Spotify profile linked.");
    return response;
  } catch {
    const response: NextResponse<unknown> = NextResponse.redirect(accountUrl);
    response.cookies.delete(stateCookieName);
    setErrorFlash(response, "Spotify could not be linked. Please try again.");
    return response;
  }
}
