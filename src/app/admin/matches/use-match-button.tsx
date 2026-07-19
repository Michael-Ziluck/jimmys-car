"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function UseMatchButton({
  songId,
  spotifyTrackId,
  artistName,
}: {
  songId: string;
  spotifyTrackId: string;
  artistName: string;
}) {
  const router: ReturnType<typeof useRouter> = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex-1">
      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const response: Response = await fetch("/api/admin/matches", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ songId, spotifyTrackId, artistName }),
              });
              const result: { error?: string } = (await response.json()) as {
                error?: string;
              };
              if (!response.ok)
                throw new Error(result.error ?? "The Spotify match could not be saved.");
              router.refresh();
            } catch (reason: unknown) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : "The Spotify match could not be saved.",
              );
            }
          });
        }}
      >
        {isPending ? "Saving…" : "Use match"}
      </Button>
      {error ? (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
