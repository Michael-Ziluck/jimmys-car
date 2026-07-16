import { NextResponse } from "next/server";

const spotifyTokenUrl = "https://accounts.spotify.com/api/token";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Spotify client credentials are not configured." }, { status: 503, headers: corsHeaders });
  }

  const params = new URLSearchParams(await request.text());
  const grantType = params.get("grant_type");
  if (grantType !== "authorization_code" && grantType !== "refresh_token") {
    return NextResponse.json({ error: "Unsupported OAuth grant type." }, { status: 400, headers: corsHeaders });
  }

  params.delete("client_id");
  params.delete("client_secret");
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const spotifyResponse = await fetch(spotifyTokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
    cache: "no-store",
  });

  const responseBody = await spotifyResponse.text();
  return new NextResponse(responseBody, {
    status: spotifyResponse.status,
    headers: {
      "Content-Type": spotifyResponse.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
      ...corsHeaders,
    },
  });
}
