import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Spotify client credentials are not configured." },
      { status: 503 },
    );
  }

  return NextResponse.json({ clientId, clientSecret });
}
