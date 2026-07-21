"use client";

import { Pencil } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { updateSongDetails } from "@/app/admin/actions";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { SongEditDialogProps, SongEditState, Tier } from "@/types";
import { SpotifyEditForm } from "./spotify-edit-dialog";

const TIERS: Tier[] = ["S", "A", "B", "C", "D", "F"];

const initialState: SongEditState = {
  status: "idle",
  message: "",
};

function SongEditForm({
  song,
  owners,
  onSaved,
}: SongEditDialogProps & { onSaved: () => void }) {
  const editAction: (
    previousState: SongEditState,
    formData: FormData,
  ) => Promise<SongEditState> = updateSongDetails.bind(null, song.id);
  const [state, formAction, pending] = useActionState(editAction, initialState);

  useEffect(() => {
    if (state.status === "success") onSaved();
  }, [onSaved, state.status]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FieldGroup>
        <Field data-invalid={state.status === "error"}>
          <FieldLabel htmlFor={`song-title-${song.id}`}>Song name</FieldLabel>
          <Input
            id={`song-title-${song.id}`}
            name="title"
            defaultValue={song.title}
            autoComplete="off"
            required
            aria-invalid={state.status === "error"}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={state.status === "error"}>
            <FieldLabel htmlFor={`song-tier-${song.id}`}>Rating</FieldLabel>
            <Select
              name="tier"
              required
              {...(song.tier ? { defaultValue: song.tier } : {})}
            >
              <SelectTrigger
                id={`song-tier-${song.id}`}
                aria-invalid={state.status === "error"}
              >
                <SelectValue placeholder="Choose a rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TIERS.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {tier} tier
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={state.status === "error"}>
            <FieldLabel htmlFor={`song-owner-${song.id}`}>Owner</FieldLabel>
            <Select
              name="ownerId"
              required
              {...(song.ownerId ? { defaultValue: song.ownerId } : {})}
            >
              <SelectTrigger
                id={`song-owner-${song.id}`}
                aria-invalid={state.status === "error"}
              >
                <SelectValue placeholder="Choose an owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.displayName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
        {state.message ? <FieldError>{state.message}</FieldError> : null}
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SongEditDialog({
  song,
  owners,
  onSongChanged,
}: SongEditDialogProps) {
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit song</DialogTitle>
          <DialogDescription>
            Spreadsheet refreshes will overwrite changes to the song details.
          </DialogDescription>
        </DialogHeader>
        <Tabs key={formKey} defaultValue="details">
          <TabsList className="w-full" aria-label="Edit options">
            <TabsTrigger value="details">Song details</TabsTrigger>
            {song.spotifyTrackId ? (
              <TabsTrigger value="spotify">Spotify link</TabsTrigger>
            ) : null}
          </TabsList>
          <TabsContent value="details" className="mt-4">
            <SongEditForm
              song={song}
              owners={owners}
              onSongChanged={onSongChanged}
              onSaved={() => {
                onSongChanged();
                setOpen(false);
              }}
            />
          </TabsContent>
          {song.spotifyTrackId ? (
            <TabsContent value="spotify" className="mt-4">
              <p className="mb-4 text-sm text-muted-foreground">
                Replace the linked track after reviewing its metadata.
              </p>
              <SpotifyEditForm
                song={song}
                onSaved={() => {
                  onSongChanged();
                  setOpen(false);
                }}
              />
            </TabsContent>
          ) : null}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
