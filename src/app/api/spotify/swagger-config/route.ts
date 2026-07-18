import { NextResponse } from "next/server";
import type { ApiError, SpotifyClientConfigResponse } from "@/types";

export async function GET(): Promise<
  NextResponse<ApiError> | NextResponse<SpotifyClientConfigResponse>
> {
  const clientId: string | undefined = process.env["SPOTIFY_CLIENT_ID"];
  const clientSecret: string | undefined = process.env["SPOTIFY_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Spotify client credentials are not configured." },
      { status: 503 },
    );
  }

  return NextResponse.json({ clientId, clientSecret });
}
