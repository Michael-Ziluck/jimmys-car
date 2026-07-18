import "server-only";

const spotifyAccountsUrl: string = "https://accounts.spotify.com";
const spotifyApiUrl: string = "https://api.spotify.com/v1";

export const spotifyScopes: string[] = ["user-read-private", "user-read-email"];

type SpotifyConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type SpotifyTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: "Bearer";
};

export type SpotifyProfile = {
  account_id?: string;
  id: string;
  display_name: string | null;
  email?: string;
  images: Array<{ url: string }>;
};

export type SpotifyTrackMetadata = {
  artistName: string;
};

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
  return ((await response.json()) as SpotifyTokenResponse).access_token;
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
  const track: { artists?: Array<{ name?: string }> } = await response.json();
  const artistName: string =
    track.artists
      ?.map((artist) => artist.name?.trim())
      .filter(Boolean)
      .join(", ") ?? "";
  if (!artistName)
    throw new Error("Spotify did not return an artist for that track.");
  return { artistName };
}
