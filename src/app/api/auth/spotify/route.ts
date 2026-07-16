import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createSpotifyAuthorizationUrl } from "@/lib/spotify";

const stateCookieName = "spotify_oauth_state";

export async function GET() {
  const state = randomUUID();
  const response = NextResponse.redirect(createSpotifyAuthorizationUrl(state));
  response.cookies.set(stateCookieName, state, {
    httpOnly: true,
    maxAge: 10 * 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}

export { stateCookieName };
