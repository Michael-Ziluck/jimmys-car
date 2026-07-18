import { type NextRequest } from "next/server";

import type { SpotifyOEmbedData } from "@/types";

const spotifyTrackIdPattern: RegExp = /^[A-Za-z0-9]{22}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> },
): Promise<Response> {
  const { trackId } = await params;
  if (!spotifyTrackIdPattern.test(trackId)) {
    return new Response(null, { status: 404 });
  }

  const spotifyUrl: string = `https://open.spotify.com/track/${trackId}`;
  const response: Response = await fetch(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`,
    { next: { revalidate: 60 * 60 * 24 * 7 } },
  );
  if (!response.ok) {
    return new Response(null, { status: 404 });
  }

  const data: SpotifyOEmbedData = (await response.json()) as SpotifyOEmbedData;
  if (!data.thumbnail_url) {
    return new Response(null, { status: 404 });
  }

  const artworkUrl: URL = new URL(data.thumbnail_url);
  const allowedArtworkHost: boolean = ["scdn.co", "spotifycdn.com"].some(
    (domain) =>
      artworkUrl.hostname === domain ||
      artworkUrl.hostname.endsWith(`.${domain}`),
  );
  if (!allowedArtworkHost) {
    return new Response(null, { status: 502 });
  }

  const artworkResponse: Response = await fetch(artworkUrl, {
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  const contentType: string = artworkResponse.headers.get("content-type") ?? "";
  if (!artworkResponse.ok || !contentType.startsWith("image/")) {
    return new Response(null, { status: 502 });
  }

  return new Response(artworkResponse.body, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
      "Content-Type": contentType,
    },
  });
}
