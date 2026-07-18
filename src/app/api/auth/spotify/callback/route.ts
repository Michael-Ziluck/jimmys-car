import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { appUsers } from "@/db/schema";
import { exchangeSpotifyCode, getSpotifyProfile, getSpotifyRedirectUri } from "@/lib/spotify";
import { setErrorFlash, setSuccessFlash } from "@/lib/flash";
import { stateCookieName } from "../route";

export async function GET(request: Request) : Promise<NextResponse<unknown>> {
  const accountUrl: URL = new URL("/account", new URL(getSpotifyRedirectUri()).origin);
  const requestUrl: URL = new URL(request.url);
  const spotifyError: string | null = requestUrl.searchParams.get("error");
  const code: string | null = requestUrl.searchParams.get("code");
  const state: string | null = requestUrl.searchParams.get("state");
  const cookieStore: Awaited<ReturnType<typeof cookies>> = await cookies();
  const expectedState: string | undefined = cookieStore.get(stateCookieName)?.value;

  if (spotifyError || !code || !state || state !== expectedState) {
    const reason: string = spotifyError ?? "invalid_state";
    const response: NextResponse<unknown> = NextResponse.redirect(accountUrl);
    response.cookies.delete(stateCookieName);
    setErrorFlash(response, reason === "access_denied" ? "Spotify linking was cancelled." : "Spotify could not be linked. Please try again.");
    return response;
  }

  try {
    const user: { id: string; discordId: string; discordUsername: string; discordDisplayName: string | null; discordAvatar: string | null; spotifyAccountId: string | null; spotifyDisplayName: string | null; spotifyImageUrl: string | null; claimedParticipantId: string | null; createdAt: Date; updatedAt: Date; } | null = await getCurrentUser();
    if (!user) {
      const response: NextResponse<unknown> = NextResponse.redirect(accountUrl);
      response.cookies.delete(stateCookieName);
      setErrorFlash(response, "Sign in with Discord before linking Spotify.");
      return response;
    }
    const token: Awaited<ReturnType<typeof exchangeSpotifyCode>> = await exchangeSpotifyCode(code);
    const profile: Awaited<ReturnType<typeof getSpotifyProfile>> = await getSpotifyProfile(token.access_token);
    const spotifyAccountId: string = profile.account_id ?? profile.id;
    const [linkedUser] = await getDb().select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.spotifyAccountId, spotifyAccountId)).limit(1);
    if (linkedUser && linkedUser.id !== user.id) {
      const response: NextResponse<unknown> = NextResponse.redirect(accountUrl);
      response.cookies.delete(stateCookieName);
      setErrorFlash(response, "That Spotify profile is already linked to another Jimmy’s Car account.");
      return response;
    }
    await getDb().update(appUsers).set({
      spotifyAccountId,
      spotifyDisplayName: profile.display_name,
      spotifyImageUrl: profile.images[0]?.url ?? null,
      updatedAt: new Date(),
    }).where(eq(appUsers.id, user.id));
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
