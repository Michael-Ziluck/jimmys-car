"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type Context,
} from "react";
import { ExternalLink, Music2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SpotifyEmbedController, SpotifyIframeApi } from "@/types";

const SPOTIFY_IFRAME_API_SRC: string =
  "https://open.spotify.com/embed/iframe-api/v1";

interface PlayerTrack {
  trackId: string;
  title: string;
}

interface SpotifyPlayerContextValue {
  playTrack: (track: PlayerTrack) => void;
}

const SpotifyPlayerContext: Context<SpotifyPlayerContextValue | null> =
  createContext<SpotifyPlayerContextValue | null>(null);

let spotifyIframeApiPromise: Promise<SpotifyIframeApi> | undefined;

function loadSpotifyIframeApi(): Promise<SpotifyIframeApi> {
  if (window.__spotifyIframeApi)
    return Promise.resolve(window.__spotifyIframeApi);
  if (spotifyIframeApiPromise) return spotifyIframeApiPromise;

  spotifyIframeApiPromise = new Promise<SpotifyIframeApi>((resolve, reject) => {
    window.onSpotifyIframeApiReady = (api) => {
      window.__spotifyIframeApi = api;
      resolve(api);
    };
    const existingScript: HTMLScriptElement | null =
      document.querySelector<HTMLScriptElement>(
        `script[src="${SPOTIFY_IFRAME_API_SRC}"]`,
      );
    if (existingScript) return;
    const script: HTMLScriptElement = document.createElement("script");
    script.src = SPOTIFY_IFRAME_API_SRC;
    script.async = true;
    script.addEventListener(
      "error",
      () => {
        spotifyIframeApiPromise = undefined;
        reject(new Error("Spotify could not load its player API."));
      },
      { once: true },
    );
    document.body.append(script);
  });

  return spotifyIframeApiPromise;
}

export function SpotifyPlayerProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<PlayerTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playerElementRef: RefObject<HTMLDivElement | null> =
    useRef<HTMLDivElement>(null);
  const controllerRef: RefObject<SpotifyEmbedController | null> =
    useRef<SpotifyEmbedController>(null);
  const pendingTrackRef: RefObject<PlayerTrack | null> =
    useRef<PlayerTrack>(null);

  const playTrack: (track: PlayerTrack) => void = useCallback(
    (nextTrack: PlayerTrack): void => {
      setError(null);
      setTrack(nextTrack);
      pendingTrackRef.current = nextTrack;
      const controller: SpotifyEmbedController | null = controllerRef.current;
      if (controller) {
        controller.loadEntity(
          `https://open.spotify.com/track/${nextTrack.trackId}`,
        );
        controller.play();
      }
    },
    [],
  );

  useEffect(() => {
    if (!track || !playerElementRef.current || controllerRef.current) return;
    let cancelled: boolean = false;
    loadSpotifyIframeApi()
      .then((api) => {
        if (cancelled || !playerElementRef.current) return;
        api.createController(
          playerElementRef.current,
          {
            url: `https://open.spotify.com/track/${track.trackId}`,
            width: "100%",
            height: 152,
          },
          (controller) => {
            if (cancelled) {
              controller.destroy();
              return;
            }
            controllerRef.current = controller;
            const pendingTrack: PlayerTrack | null = pendingTrackRef.current;
            if (pendingTrack?.trackId !== track.trackId)
              controller.loadEntity(
                `https://open.spotify.com/track/${pendingTrack?.trackId}`,
              );
            controller.play();
          },
        );
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Spotify could not load its player API.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [track]);

  useEffect(
    () => () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    },
    [],
  );

  const contextValue: SpotifyPlayerContextValue = useMemo(
    () => ({ playTrack }),
    [playTrack],
  );

  const closePlayer = (): void => {
    controllerRef.current?.pause();
    controllerRef.current?.destroy();
    controllerRef.current = null;
    pendingTrackRef.current = null;
    setTrack(null);
    setError(null);
  };

  return (
    <SpotifyPlayerContext value={contextValue}>
      <div className={`flex min-h-0 flex-1 flex-col ${track ? "pb-52" : ""}`}>
        {children}
      </div>
      {track ? (
        <aside
          aria-label="Spotify player"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 shadow-[0_-12px_35px_rgba(41,37,36,0.12)] backdrop-blur-md"
        >
          <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-10">
            <div className="mb-2 flex min-w-0 items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <Music2 className="size-3.5" aria-hidden="true" />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-950">
                {track.title}
              </p>
              <Button asChild variant="ghost" size="sm" className="text-stone-600">
                <a
                  href={`https://open.spotify.com/track/${track.trackId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="hidden sm:inline">Open in Spotify</span>
                  <ExternalLink className="size-4" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={closePlayer}
                aria-label="Close Spotify player"
              >
                <X />
              </Button>
            </div>
            {error ? (
              <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            ) : (
              <div
                ref={playerElementRef}
                className="h-[152px] w-full overflow-hidden rounded-xl bg-stone-100"
              />
            )}
          </div>
        </aside>
      ) : null}
    </SpotifyPlayerContext>
  );
}

export function useSpotifyPlayer(): SpotifyPlayerContextValue {
  const context: SpotifyPlayerContextValue | null = useContext(
    SpotifyPlayerContext,
  );
  if (!context)
    throw new Error("useSpotifyPlayer must be used within SpotifyPlayerProvider.");
  return context;
}
