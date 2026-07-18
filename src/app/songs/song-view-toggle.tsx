import { useSyncExternalStore } from "react";
import type { SongView } from "./song-results";

const storageKey: string = "jimmys-car-song-view";
const storageEvent: string = "jimmys-car-song-view-change";
let preferenceRequest: Promise<SongView> | undefined;

export function getStoredSongView(): SongView {
  if (typeof window === "undefined") return "cards";
  return window.localStorage.getItem(storageKey) === "list" ? "list" : "cards";
}

export function storeSongView(view: SongView): void {
  window.localStorage.setItem(storageKey, view);
  window.dispatchEvent(new Event(storageEvent));
}

export function ensureStoredSongView(): Promise<SongView> {
  if (window.localStorage.getItem(storageKey))
    return Promise.resolve(getStoredSongView());
  if (preferenceRequest) return preferenceRequest;

  preferenceRequest = fetch("/api/preferences", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return "cards";
      const preference: { songView?: SongView } = (await response.json()) as {
        songView?: SongView;
      };
      return preference.songView === "list" ? "list" : "cards";
    })
    .catch(() => "cards" as const)
    .then((view) => {
      storeSongView(view);
      return view;
    })
    .finally(() => {
      preferenceRequest = undefined;
    });

  return preferenceRequest;
}

const subscribe = (onStoreChange: () => void): (() => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(storageEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(storageEvent, onStoreChange);
  };
};

export function useStoredSongView(): SongView {
  return useSyncExternalStore(subscribe, getStoredSongView, () => "cards");
}

export function useBrowserReady(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}
