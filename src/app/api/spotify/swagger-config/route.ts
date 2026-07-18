import { NextResponse } from "next/server";

export async function GET(): Promise<
  | NextResponse<{ error: string }>
  | NextResponse<{ clientId: string; clientSecret: string }>
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
