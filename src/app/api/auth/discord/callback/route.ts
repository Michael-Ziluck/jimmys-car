import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSession, sessionCookie, upsertDiscordUser } from "@/lib/auth";
import {
  exchangeDiscordCode,
  getDiscordProfile,
  getDiscordRedirectUri,
} from "@/lib/discord";
import { setErrorFlash, setSuccessFlash } from "@/lib/flash";
import type {
  AppUser,
  DiscordTokenResponse,
  SessionCookie,
  SessionIdentity,
} from "@/types";
import { discordStateCookieName } from "../route";

export async function GET(request: Request): Promise<NextResponse> {
  const accountUrl: URL = new URL(
    "/account",
    new URL(getDiscordRedirectUri()).origin,
  );
  const url: URL = new URL(request.url);
  const expectedState: string | undefined = (await cookies()).get(
    discordStateCookieName,
  )?.value;
  const code: string | null = url.searchParams.get("code");
  const state: string | null = url.searchParams.get("state");
  const error: string | null = url.searchParams.get("error");
  if (error || !code || !state || state !== expectedState) {
    const response: NextResponse = NextResponse.redirect(accountUrl);
    response.cookies.delete(discordStateCookieName);
    setErrorFlash(
      response,
      error === "access_denied"
        ? "Discord sign-in was cancelled."
        : "Discord could not complete the sign-in. Please try again.",
    );
    return response;
  }
  try {
    const token: DiscordTokenResponse = await exchangeDiscordCode(code);
    const user: AppUser | undefined = await upsertDiscordUser(
      await getDiscordProfile(token.access_token),
    );
    if (!user) throw new Error("Discord user upsert did not return a user.");
    const session: SessionIdentity = await createSession(user.id);
    const response: NextResponse = NextResponse.redirect(accountUrl);
    response.cookies.delete(discordStateCookieName);
    const cookie: SessionCookie = sessionCookie(session.id, session.expiresAt);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    setSuccessFlash(response, "Discord is connected. Your account is ready.");
    return response;
  } catch {
    const response: NextResponse = NextResponse.redirect(accountUrl);
    response.cookies.delete(discordStateCookieName);
    setErrorFlash(
      response,
      "Discord could not complete the sign-in. Please try again.",
    );
    return response;
  }
}
