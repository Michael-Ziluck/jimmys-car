"use client";

import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSpotifyPlayer } from "@/components/spotify-player-provider";
import type { SpotifyEmbedDialogProps } from "@/types";

export function SpotifyEmbedDialog({
  trackId,
  songTitle,
}: SpotifyEmbedDialogProps) {
  const { playTrack } = useSpotifyPlayer();
  return (
    <Button
      variant="outline"
      size="sm"
      title={`Listen to ${songTitle} on Spotify`}
      onClick={() => playTrack({ trackId, title: songTitle })}
    >
      <Play className="size-3.5 fill-current" />
      Listen
    </Button>
  );
}
