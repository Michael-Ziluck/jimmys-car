export interface DiscordConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface DiscordProfile {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

export interface DiscordTokenResponse {
  access_token: string;
}

export interface DiscordRateLimitResponse {
  retry_after?: number;
}

export interface DiscordMessage {
  id: string;
  content: string;
  timestamp: string;
  author?: { username?: string };
  attachments?: Array<{ url?: string }>;
  embeds?: Array<{
    url?: string;
    description?: string;
    title?: string;
    provider?: { name?: string };
  }>;
}
