import "server-only";

import type {
  DiscordConfig,
  DiscordProfile,
  DiscordTokenResponse,
} from "@/types";

const DISCORD_API: string = "https://discord.com/api/v10";

function getDiscordConfig(): DiscordConfig {
  const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI } =
    process.env;
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI) {
    throw new Error(
      "Discord is not configured. Add the Discord values to .env.local.",
    );
  }
  return {
    clientId: DISCORD_CLIENT_ID,
    clientSecret: DISCORD_CLIENT_SECRET,
    redirectUri: DISCORD_REDIRECT_URI,
  };
}

export function createDiscordAuthorizationUrl(state: string): URL {
  const { clientId, redirectUri } = getDiscordConfig();
  const url: URL = new URL(`${DISCORD_API}/oauth2/authorize`);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state,
  }).toString();
  return url;
}

export function getDiscordRedirectUri(): string {
  return getDiscordConfig().redirectUri;
}

export async function exchangeDiscordCode(
  code: string,
): Promise<DiscordTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getDiscordConfig();
  const response: Response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`Discord token exchange failed (${response.status}).`);
  return response.json() as Promise<DiscordTokenResponse>;
}

export async function getDiscordProfile(
  accessToken: string,
): Promise<DiscordProfile> {
  const response: Response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`Discord profile request failed (${response.status}).`);
  return response.json() as Promise<DiscordProfile>;
}

export function discordAvatarUrl(profile: DiscordProfile): string | null {
  return profile.avatar
    ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`
    : null;
}
