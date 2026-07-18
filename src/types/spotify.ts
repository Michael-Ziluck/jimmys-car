export interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: "Bearer";
}

export interface SpotifyProfile {
  account_id?: string;
  id: string;
  display_name: string | null;
  email?: string;
  images: Array<{ url: string }>;
}

export interface SpotifyTrackMetadata {
  artistName: string;
  title: string;
}

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
}

export interface SpotifyOEmbedData {
  html?: string;
  title?: string;
  height?: number;
  thumbnail_url?: string;
}

export interface SpotifyEmbedResponse extends SpotifyEmbedData {
  src: string;
}

export interface SpotifyClientConfigResponse {
  clientId: string;
  clientSecret: string;
}

export interface ApiError {
  error: string;
}

export interface CorsHeaders extends Record<string, string> {
  "Access-Control-Allow-Origin": string;
  "Access-Control-Allow-Methods": string;
  "Access-Control-Allow-Headers": string;
}

export interface SpotifyTrackApiResponse {
  id?: string;
  name?: string;
  external_urls?: { spotify?: string };
  album?: { images?: Array<{ url?: string; width?: number; height?: number }> };
  artists?: Array<{ name?: string }>;
}

export interface SpotifySearchResponse {
  tracks?: { items?: SpotifyTrackApiResponse[] };
}

export interface SpotifyTrackMatch {
  id: string;
  title: string;
  artistName: string;
  spotifyUrl: string;
  imageUrl: string | null;
}

export interface SpotifyEmbedData {
  title: string;
  height: number;
  spotifyUrl: string;
}

export interface SpotifyEmbedController {
  destroy: () => void;
  pause: () => void;
}

export interface SpotifyIframeApi {
  createController: (
    element: HTMLElement,
    options: { url: string; width: string; height: number },
    callback: (controller: SpotifyEmbedController) => void,
  ) => void;
}
