import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { createDiscordAuthorizationUrl, getDiscordRedirectUri } from "@/lib/discord";

export const discordStateCookieName: string = "discord_oauth_state";

export async function GET(request: Request): Promise<NextResponse> {
  const configuredOrigin: string = new URL(getDiscordRedirectUri()).origin;
  const requestUrl: URL = new URL(request.url);
  const requestOrigin: string = request.headers.get("host") ? `${requestUrl.protocol}//${request.headers.get("host")}` : requestUrl.origin;
  if (requestOrigin !== configuredOrigin) {
    const normalizedUrl: URL = new URL(requestUrl.pathname + requestUrl.search, configuredOrigin);
    return NextResponse.redirect(normalizedUrl);
  }

  const state: string = randomUUID();
  const response: NextResponse = NextResponse.redirect(createDiscordAuthorizationUrl(state));
  response.cookies.set(discordStateCookieName, state, { httpOnly: true, maxAge: 10 * 60, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  return response;
}
