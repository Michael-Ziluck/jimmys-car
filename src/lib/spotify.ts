import "server-only";

import type {
  SpotifyConfig,
  SpotifyProfile,
  SpotifyTokenResponse,
  SpotifyTrackApiResponse,
  SpotifyTrackMatch,
  SpotifyTrackMetadata,
  SpotifySearchResponse,
} from "@/types";

const spotifyAccountsUrl: string = "https://accounts.spotify.com";
const spotifyApiUrl: string = "https://api.spotify.com/v1";
let appAccessToken: { value: string; expiresAt: number } | null = null;

export const spotifyScopes: string[] = ["user-read-private", "user-read-email"];

function getSpotifyConfig(): SpotifyConfig {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI } =
    process.env;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) {
    throw new Error(
      "Spotify is not configured. Add the Spotify values to .env.local.",
    );
  }

  return {
    clientId: SPOTIFY_CLIENT_ID,
    clientSecret: SPOTIFY_CLIENT_SECRET,
    redirectUri: SPOTIFY_REDIRECT_URI,
  };
}

async function getSpotifyAppAccessToken(): Promise<string> {
  if (appAccessToken && appAccessToken.expiresAt > Date.now() + 30_000)
    return appAccessToken.value;
  const { clientId, clientSecret } = getSpotifyConfig();
  const credentials: string = Buffer.from(
    `${clientId}:${clientSecret}`,
  ).toString("base64");
  const response: Response = await fetch(`${spotifyAccountsUrl}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });

  if (!response.ok)
    throw new Error(`Spotify app token request failed (${response.status}).`);
  const token: SpotifyTokenResponse = await response.json();
  appAccessToken = {
    value: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1_000,
  };
  return token.access_token;
}

export function getSpotifyRedirectUri(): string {
  return getSpotifyConfig().redirectUri;
}

export function createSpotifyAuthorizationUrl(state: string): URL {
  const { clientId, redirectUri } = getSpotifyConfig();
  const url: URL = new URL(`${spotifyAccountsUrl}/authorize`);
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: spotifyScopes.join(" "),
    state,
  }).toString();
  return url;
}

export async function exchangeSpotifyCode(
  code: string,
): Promise<SpotifyTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getSpotifyConfig();
  const credentials: string = Buffer.from(
    `${clientId}:${clientSecret}`,
  ).toString("base64");
  const response: Response = await fetch(`${spotifyAccountsUrl}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Spotify token exchange failed (${response.status}).`);
  }

  return response.json();
}

export async function getSpotifyProfile(
  accessToken: string,
): Promise<SpotifyProfile> {
  const response: Response = await fetch(`${spotifyApiUrl}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Spotify profile request failed (${response.status}).`);
  }

  return response.json();
}

export async function getSpotifyTrackMetadata(
  trackId: string,
): Promise<SpotifyTrackMetadata> {
  const accessToken: string = await getSpotifyAppAccessToken();
  let response: Response | undefined;
  for (let attempt: number = 0; attempt < 3; attempt += 1) {
    response = await fetch(`${spotifyApiUrl}/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (response.status !== 429) break;
    const retryAfterSeconds: number = Number(
      response.headers.get("retry-after") ?? "1",
    );
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(retryAfterSeconds, 1) * 1_000),
    );
  }

  if (!response?.ok)
    throw new Error(
      `Spotify track request failed (${response?.status ?? "no response"}).`,
    );
  const track: SpotifyTrackApiResponse = await response.json();
  const artistName: string =
    track.artists
      ?.map((artist) => artist.name?.trim())
      .filter(Boolean)
      .join(", ") ?? "";
  if (!artistName)
    throw new Error("Spotify did not return an artist for that track.");
  if (!track.name?.trim())
    throw new Error("Spotify did not return a title for that track.");
  return { artistName, title: track.name.trim() };
}

function normalizeTitle(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/\b(remaster(?:ed)?|mono|stereo|version|edit|mix|live)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleScore(searchTitle: string, resultTitle: string): number {
  const search: string = normalizeTitle(searchTitle);
  const result: string = normalizeTitle(resultTitle);
  if (search === result) return 1_000;
  if (result.startsWith(search) || search.startsWith(result)) return 700;
  if (result.includes(search) || search.includes(result)) return 500;
  const searchWords: Set<string> = new Set(search.split(" ").filter(Boolean));
  const resultWords: Set<string> = new Set(result.split(" ").filter(Boolean));
  const overlap: number = [...searchWords].filter((word) => resultWords.has(word)).length;
  return (overlap / Math.max(searchWords.size, resultWords.size, 1)) * 400;
}

export async function searchSpotifyTrackMatches(
  title: string,
  limit: number = 3,
): Promise<SpotifyTrackMatch[]> {
  const accessToken: string = await getSpotifyAppAccessToken();
  const params: URLSearchParams = new URLSearchParams({
    q: `track:${title}`,
    type: "track",
    limit: "10",
  });
  const response: Response = await fetch(`${spotifyApiUrl}/search?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`Spotify search failed (${response.status}).`);

  const payload: SpotifySearchResponse = await response.json();
  type RankedCandidate = {
    track: SpotifyTrackApiResponse & { id: string; name: string };
    artistKey: string;
    score: number;
  };
  const candidates: RankedCandidate[] = (payload.tracks?.items ?? [])
    .filter(
      (track): track is SpotifyTrackApiResponse & { id: string; name: string } =>
        Boolean(track.id && track.name && track.artists?.[0]?.name),
    )
    .map((track) => ({
      track,
      artistKey: (track.artists?.[0]?.name ?? "")
        .trim()
        .toLocaleLowerCase(),
      score:
        titleScore(title, track.name) +
        (/\bremaster(?:ed)?\b/i.test(track.name) ? 25 : 0),
    }))
    .sort((left, right) => right.score - left.score);

  const byArtist: Map<string, (typeof candidates)[number]> = new Map();
  for (const candidate of candidates) {
    const existing: RankedCandidate | undefined = byArtist.get(
      candidate.artistKey,
    );
    if (!existing || candidate.score > existing.score)
      byArtist.set(candidate.artistKey, candidate);
  }

  return [...byArtist.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ track }) => ({
      id: track.id,
      title: track.name,
      artistName: track.artists!
        .map((artist) => artist.name?.trim())
        .filter(Boolean)
        .join(", "),
      spotifyUrl:
        track.external_urls?.spotify ??
        `https://open.spotify.com/track/${track.id}`,
      imageUrl: track.album?.images?.[0]?.url ?? null,
    }));
}
