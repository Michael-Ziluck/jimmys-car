"use client";

import Image from "next/image";
import { ExternalLink, Pencil } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import {
  confirmSpotifySongEdit,
  previewSpotifySongEdit,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
  SpotifyEditDialogProps,
  SpotifyEditState,
  SpotifyTrackPreview,
} from "@/types";

const initialState: SpotifyEditState = {
  status: "idle",
  message: "",
  before: null,
  after: null,
};

function TrackPreview({
  label,
  track,
}: {
  label: string;
  track: SpotifyTrackPreview;
}) {
  return (
    <Card size="sm" className="min-w-0 bg-stone-50/70">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="truncate">{track.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-w-0 gap-3">
        <Image
          src={`/api/spotify/art/${track.spotifyTrackId}`}
          alt={`Album art for ${track.title}`}
          width={56}
          height={56}
          className="size-14 shrink-0 rounded-lg object-cover ring-1 ring-stone-950/5"
        />
        <div className="min-w-0">
          <p className="truncate text-sm text-stone-600">
            {track.artistName ?? "Artist unavailable"}
          </p>
          <a
            href={`https://open.spotify.com/track/${track.spotifyTrackId}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:underline"
          >
            Open on Spotify
            <ExternalLink data-icon="inline-end" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function SpotifyEditForm({
  song,
  onSaved,
}: SpotifyEditDialogProps & { onSaved: () => void }) {
  const previewAction: (
    previousState: SpotifyEditState,
    formData: FormData,
  ) => Promise<SpotifyEditState> = previewSpotifySongEdit.bind(null, song.id);
  const [preview, previewFormAction, previewPending] = useActionState(
    previewAction,
    initialState,
  );
  const [confirmation, setConfirmation] = useState<SpotifyEditState | null>(
    null,
  );
  const [confirmPending, startConfirm] = useTransition();
  const visibleState: SpotifyEditState = confirmation ?? preview;

  const confirm = (): void => {
    if (!preview.before || !preview.after) return;
    const beforeTrackId: string = preview.before.spotifyTrackId;
    const afterTrackId: string = preview.after.spotifyTrackId;
    startConfirm(() => {
      void confirmSpotifySongEdit(song.id, beforeTrackId, afterTrackId).then(
        (result) => {
          setConfirmation(result);
          if (result.status === "success") onSaved();
        },
      );
    });
  };

  if (preview.status === "preview" && preview.before && preview.after)
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          <TrackPreview label="Before" track={preview.before} />
          <TrackPreview label="After" track={preview.after} />
        </div>
        <p className="text-sm text-stone-600">
          Saving replaces the Spotify link, title, artist, and album artwork
          shown everywhere this song appears.
        </p>
        {visibleState.message ? (
          <p
            className={
              visibleState.status === "error"
                ? "text-sm text-destructive"
                : "text-sm font-medium text-emerald-700"
            }
            aria-live="polite"
          >
            {visibleState.message}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={confirm} disabled={confirmPending}>
            {confirmPending ? "Saving…" : "Confirm update"}
          </Button>
        </DialogFooter>
      </>
    );

  return (
    <form action={previewFormAction} className="flex flex-col gap-4">
      <Field data-invalid={visibleState.status === "error"}>
        <FieldLabel htmlFor={`spotify-edit-${song.id}`}>
          New Spotify track
        </FieldLabel>
        <Input
          id={`spotify-edit-${song.id}`}
          name="spotifyTrack"
          placeholder="https://open.spotify.com/track/…"
          autoComplete="off"
          required
          aria-invalid={visibleState.status === "error"}
        />
        {visibleState.message ? (
          <FieldError>{visibleState.message}</FieldError>
        ) : null}
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={previewPending}>
          {previewPending ? "Loading preview…" : "Review change"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SpotifyEditDialog({
  song,
  onSongChanged,
}: SpotifyEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const setDialogOpen = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (nextOpen) setFormKey((value) => value + 1);
  };

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title={`Edit ${song.title}`}>
          <Pencil data-icon="inline-start" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Update Spotify match</DialogTitle>
          <DialogDescription>
            Only the Spotify track can be changed here. You will review all
            metadata changes before saving.
          </DialogDescription>
        </DialogHeader>
        <SpotifyEditForm
          key={formKey}
          song={song}
          onSongChanged={onSongChanged}
          onSaved={() => {
            onSongChanged();
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
