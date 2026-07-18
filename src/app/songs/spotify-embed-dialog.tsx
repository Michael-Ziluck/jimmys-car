"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { ExternalLink, Play } from "lucide-react";

import { Button } from "@/components/ui/button";

type EmbedData = {
  title: string;
  height: number;
  spotifyUrl: string;
};

type SpotifyEmbedController = {
  destroy: () => void;
  pause: () => void;
};

type SpotifyIframeApi = {
  createController: (
    element: HTMLElement,
    options: { url: string; width: string; height: number },
    callback: (controller: SpotifyEmbedController) => void,
  ) => void;
};

declare global {
  interface Window {
    __spotifyIframeApi?: SpotifyIframeApi;
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
  }
}

const SPOTIFY_IFRAME_API_SRC: string =
  "https://open.spotify.com/embed/iframe-api/v1";
let spotifyIframeApi: SpotifyIframeApi | undefined;
let spotifyIframeApiPromise: Promise<SpotifyIframeApi> | undefined;

function loadSpotifyIframeApi(): Promise<SpotifyIframeApi> {
  if (window.__spotifyIframeApi)
    return Promise.resolve(window.__spotifyIframeApi);
  if (spotifyIframeApi) return Promise.resolve(spotifyIframeApi);
  if (spotifyIframeApiPromise) return spotifyIframeApiPromise;

  spotifyIframeApiPromise = new Promise<SpotifyIframeApi>((resolve, reject) => {
    const previousReadyHandler: ((api: SpotifyIframeApi) => void) | undefined =
      window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      spotifyIframeApi = api;
      window.__spotifyIframeApi = api;
      previousReadyHandler?.(api);
      resolve(api);
    };

    const existingScript: HTMLScriptElement | null =
      document.querySelector<HTMLScriptElement>(
        `script[src="${SPOTIFY_IFRAME_API_SRC}"]`,
      );
    existingScript?.remove();

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

export function SpotifyEmbedDialog({
  trackId,
  songTitle,
}: {
  trackId: string;
  songTitle: string;
}) {
  const [hasOpened, setHasOpened] = useState(false);
  const [embed, setEmbed] = useState<EmbedData>();
  const [error, setError] = useState("");
  const playerElementRef: RefObject<HTMLDivElement | null> =
    useRef<HTMLDivElement>(null);
  const controllerRef: RefObject<SpotifyEmbedController | null> =
    useRef<SpotifyEmbedController>(null);
  const dialogRef: RefObject<HTMLDialogElement | null> =
    useRef<HTMLDialogElement>(null);

  const openDialog: () => void = useCallback(() => {
    setHasOpened(true);
    dialogRef.current?.showModal();
  }, []);

  const closeDialog: () => void = useCallback(() => {
    controllerRef.current?.pause();
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    if (!hasOpened || embed || error) return;
    const controller: AbortController = new AbortController();
    fetch(`/api/spotify/oembed?trackId=${encodeURIComponent(trackId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Spotify could not load this player.");
        setEmbed((await response.json()) as EmbedData);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Spotify could not load this player.",
        );
      });
    return () => controller.abort();
  }, [embed, error, hasOpened, trackId]);

  useEffect(() => {
    if (
      !hasOpened ||
      !embed ||
      !playerElementRef.current ||
      controllerRef.current
    )
      return;

    let cancelled: boolean = false;
    loadSpotifyIframeApi()
      .then((api) => {
        if (cancelled || !playerElementRef.current) return;
        api.createController(
          playerElementRef.current,
          { url: embed.spotifyUrl, width: "100%", height: embed.height },
          (controller) => {
            if (cancelled) {
              controller.destroy();
              return;
            }
            controllerRef.current = controller;
          },
        );
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Spotify could not load its player API.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [embed, hasOpened]);

  useEffect(
    () => () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    },
    [],
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        title={`Listen to ${songTitle} on Spotify`}
        onClick={openDialog}
      >
        <Play className="size-3.5 fill-current" />
        Listen
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`spotify-player-${trackId}`}
        className="m-auto w-full max-w-[calc(100%-2rem)] rounded-xl bg-popover p-0 text-sm text-popover-foreground ring-1 ring-foreground/10 backdrop:bg-black/10 backdrop:backdrop-blur-xs sm:max-w-lg"
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        onClose={() => {
          controllerRef.current?.pause();
        }}
      >
        <div className="grid gap-4 p-4">
          <div className="flex flex-col gap-2 pr-8">
            <h2
              id={`spotify-player-${trackId}`}
              className="font-heading text-base leading-none font-medium"
            >
              {embed?.title ?? songTitle}
            </h2>
            <p className="text-sm text-muted-foreground">Spotify player</p>
          </div>
          {hasOpened &&
            (embed ? (
              <div
                ref={playerElementRef}
                className="min-h-38 w-full overflow-hidden rounded-xl"
              />
            ) : error ? (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            ) : (
              <div
                className="h-38 animate-pulse rounded-xl bg-muted"
                aria-label="Loading Spotify player"
              />
            ))}
          <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
            <Button asChild variant="outline">
              <a
                href={
                  embed?.spotifyUrl ??
                  `https://open.spotify.com/track/${trackId}`
                }
                target="_blank"
                rel="noreferrer"
              >
                Open in Spotify
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2"
            onClick={closeDialog}
          >
            <span aria-hidden>×</span>
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </dialog>
    </>
  );
}
