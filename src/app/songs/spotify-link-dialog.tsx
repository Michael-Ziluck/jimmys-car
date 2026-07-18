"use client";

import { useActionState } from "react";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  submitSpotifySuggestion,
  type SpotifySuggestionState,
} from "./actions";

const initialSpotifySuggestionState: SpotifySuggestionState = {
  status: "idle",
  message: "",
};

export function SpotifyLinkDialog({ songId, title }: { songId: string; title: string }) {
  const action: (_previousState: SpotifySuggestionState, formData: FormData) => Promise<SpotifySuggestionState> = submitSpotifySuggestion.bind(null, songId);
  const [state, formAction, pending] = useActionState(action, initialSpotifySuggestionState);
  const searchUrl: string = `https://open.spotify.com/search/${encodeURIComponent(title)}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Find on Spotify</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link “{title}”</DialogTitle>
          <DialogDescription>
            Search Spotify in a new tab, then paste the track share link or its 22-character ID below.
          </DialogDescription>
        </DialogHeader>
        <Button asChild variant="outline" className="justify-between">
          <a href={searchUrl} target="_blank" rel="noreferrer">
            Search Spotify
            <ExternalLink className="size-4" />
          </a>
        </Button>
        <form action={formAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`spotify-track-${songId}`}>Spotify track ID or share link</Label>
            <Input
              id={`spotify-track-${songId}`}
              name="spotifyTrack"
              placeholder="https://open.spotify.com/track/…"
              autoComplete="off"
              required
            />
          </div>
          {state.message ? (
            <p
              className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-700"}
              aria-live="polite"
            >
              {state.message}
            </p>
          ) : null}
          <DialogFooter className="mx-0 mb-0 rounded-lg px-0 pb-0">
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting…" : "Submit for review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
