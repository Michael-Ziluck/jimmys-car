import { NextResponse, type NextRequest } from "next/server";

const spotifyTrackIdPattern: RegExp = /^[A-Za-z0-9]{22}$/;

export async function GET(request: NextRequest) : Promise<NextResponse<{ error: string; }> | NextResponse<{ src: string; title: string; height: number; spotifyUrl: string; }>> {
  const trackId: string = request.nextUrl.searchParams.get("trackId") ?? "";
  if (!spotifyTrackIdPattern.test(trackId)) {
    return NextResponse.json({ error: "Invalid Spotify track ID." }, { status: 400 });
  }

  const spotifyUrl: string = `https://open.spotify.com/track/${trackId}`;
  const response: Response = await fetch(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`,
    { next: { revalidate: 60 * 60 * 24 } },
  );
  if (!response.ok) {
    return NextResponse.json({ error: "Spotify embed is unavailable." }, { status: response.status });
  }

  const data: { html?: string; title?: string; height?: number; } = await response.json() as { html?: string; title?: string; height?: number };
  const source: string | undefined = data.html?.match(/\ssrc="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
  if (!source) {
    return NextResponse.json({ error: "Spotify returned an invalid embed." }, { status: 502 });
  }

  const embedUrl: URL = new URL(source);
  if (embedUrl.hostname !== "open.spotify.com" || !embedUrl.pathname.startsWith(`/embed/track/${trackId}`)) {
    return NextResponse.json({ error: "Spotify returned an unexpected embed." }, { status: 502 });
  }

  return NextResponse.json(
    { src: embedUrl.toString(), title: data.title ?? "Spotify track", height: data.height ?? 152, spotifyUrl },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
