import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeSpotifyCode, getSpotifyProfile } from "@/lib/spotify";
import { stateCookieName } from "../route";

const profileCookieName = "spotify_profile";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const spotifyError = requestUrl.searchParams.get("error");
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(stateCookieName)?.value;

  if (spotifyError || !code || !state || state !== expectedState) {
    const reason = spotifyError ?? "invalid_state";
    const response = NextResponse.redirect(new URL(`/spotify?error=${encodeURIComponent(reason)}`, request.url));
    response.cookies.delete(stateCookieName);
    return response;
  }

  try {
    const token = await exchangeSpotifyCode(code);
    const profile = await getSpotifyProfile(token.access_token);
    const response = NextResponse.redirect(new URL("/spotify?connected=1", request.url));

    response.cookies.delete(stateCookieName);
    response.cookies.set(profileCookieName, JSON.stringify({
      id: profile.id,
      displayName: profile.display_name,
      imageUrl: profile.images[0]?.url ?? null,
    }), {
      httpOnly: true,
      maxAge: 60 * 60,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/spotify?error=connection_failed", request.url));
    response.cookies.delete(stateCookieName);
    return response;
  }
}
