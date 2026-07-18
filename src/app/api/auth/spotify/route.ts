import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createSpotifyAuthorizationUrl } from "@/lib/spotify";

const stateCookieName: string = "spotify_oauth_state";

export async function GET(): Promise<NextResponse> {
  const state: string = randomUUID();
  const response: NextResponse = NextResponse.redirect(
    createSpotifyAuthorizationUrl(state),
  );
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
