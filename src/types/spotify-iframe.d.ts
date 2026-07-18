import type { SpotifyIframeApi } from "./spotify";

declare global {
  interface Window {
    __spotifyIframeApi?: SpotifyIframeApi;
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
  }
}

export {};
