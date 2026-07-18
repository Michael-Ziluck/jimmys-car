"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { storeSongView } from "@/app/songs/song-view-toggle";
import type {
  AccountData,
  AccountUpdateRequest,
  ApiErrorResponse,
  SongView,
} from "@/types";

let accountRequest: Promise<AccountData> | null = null;

function fetchAccount(): Promise<AccountData> {
  if (accountRequest) return accountRequest;
  accountRequest = fetch("/api/account", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Could not load your profile.");
      return response.json() as Promise<AccountData>;
    })
    .finally(() => {
      accountRequest = null;
    });
  return accountRequest;
}

export default function AccountPage() {
  const [data, setData] = useState<AccountData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingPreference, setSavingPreference] = useState(false);
  const [loadKey, setLoadKey] = useState(0);

  const load: () => void = useCallback(
    (): void =>
      void fetchAccount()
        .then((nextData) => {
          setLoadError(null);
          setData(nextData);
        })
        .catch((reason: unknown) =>
          setLoadError(
            reason instanceof Error
              ? reason.message
              : "Could not load your profile.",
          ),
        ),
    [],
  );
  useEffect(load, [loadKey, load]);

  const update = (body: AccountUpdateRequest, isPreference = false): void => {
    if (isPreference) setSavingPreference(true);
    void fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (response) => {
        const result: ApiErrorResponse =
          (await response.json()) as ApiErrorResponse;
        setMessage(
          result.error ?? (response.ok ? "Saved." : "Could not save."),
        );
        if (response.ok) {
          if (isPreference) {
            const songView: SongView | undefined = body.songView;
            if (songView === "cards" || songView === "list")
              storeSongView(songView);
          }
          load();
        }
      })
      .catch(() =>
        setMessage("Could not save. Check your connection and try again."),
      )
      .finally(() => {
        if (isPreference) setSavingPreference(false);
      });
  };

  if (!data && loadError)
    return (
      <main
        id="main-content"
        className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-10 sm:py-16"
      >
        <div
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6"
          role="alert"
        >
          <p className="font-medium">{loadError}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setLoadKey((value) => value + 1)}
          >
            Try again
          </Button>
        </div>
      </main>
    );
  if (!data)
    return (
      <main
        id="main-content"
        className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-10 sm:py-16"
      >
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-11 w-48" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
        <Skeleton className="mt-6 h-48 rounded-2xl" />
      </main>
    );
  if (!data.user)
    return (
      <main
        id="main-content"
        className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:px-10 sm:py-16"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
          Account
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950">
          Join Jimmy&apos;s Car
        </h1>
        <p className="mt-4 text-stone-600">
          Use Discord to create your account.
        </p>
        <Card className="mt-8 rounded-2xl py-0">
          <CardContent className="p-6">
            <Button asChild className="rounded-full bg-[#5865f2]">
              <a href="/api/auth/discord">Continue with Discord</a>
            </Button>
          </CardContent>
        </Card>
      </main>
    );

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-10 sm:py-16"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
        Your account
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950">
        Profile
      </h1>
      {message ? (
        <p className="mt-4 rounded-xl border p-4 text-sm text-stone-700">
          {message}
        </p>
      ) : null}
      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <Card size="sm" className="rounded-2xl">
          <CardHeader>
            <CardTitle>Discord</CardTitle>
            <CardDescription>Your account identity</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {data.user.discordDisplayName ?? data.user.discordUsername}
            </p>
            <p className="text-sm text-stone-500">
              @{data.user.discordUsername}
            </p>
          </CardContent>
        </Card>
        <Card size="sm" className="rounded-2xl">
          <CardHeader>
            <CardTitle>Spotify</CardTitle>
            <CardDescription>Optional profile connection</CardDescription>
          </CardHeader>
          <CardContent>
            {data.user.spotifyAccountId ? (
              <>
                <p className="font-semibold">
                  {data.user.spotifyDisplayName ?? "Connected Spotify account"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => update({ action: "disconnect-spotify" })}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button asChild className="bg-[#1ed760] text-stone-950">
                <a href="/api/auth/spotify">Link Spotify</a>
              </Button>
            )}
          </CardContent>
        </Card>
      </section>
      <section className="mt-6">
        <Card size="sm" className="rounded-2xl">
          <CardHeader>
            <CardTitle>Jimmy&apos;s Car identity</CardTitle>
            <CardDescription>
              Claim the name you use in the tier history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.claimedParticipant ? (
              <p className="font-semibold">
                Claimed as {data.claimedParticipant.displayName}
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {data.claimableParticipants.map((participant) => (
                  <Button
                    key={participant.id}
                    variant="outline"
                    className="justify-between"
                    onClick={() =>
                      update({ action: "claim", participantId: participant.id })
                    }
                  >
                    {participant.displayName}
                    <span>Claim</span>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      <section className="mt-6" aria-labelledby="preferences-heading">
        <Card size="sm" className="rounded-2xl">
          <CardHeader>
            <CardTitle id="preferences-heading">Preferences</CardTitle>
            <CardDescription>
              Choose how songs are displayed across current and historical
              pages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="grid gap-3 sm:grid-cols-2"
              role="radiogroup"
              aria-label="Song display"
            >
              {[
                {
                  value: "cards" as const,
                  label: "Card view",
                  description: "Visual tiles with room for song details",
                  icon: LayoutGrid,
                },
                {
                  value: "list" as const,
                  label: "List view",
                  description: "Compact rows for faster scanning",
                  icon: List,
                },
              ].map((option) => {
                const Icon: typeof LayoutGrid = option.icon;
                const selected: boolean = data.user?.songView === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={savingPreference}
                    onClick={() =>
                      update(
                        { action: "set-song-view", songView: option.value },
                        true,
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 ${selected ? "border-amber-700 bg-amber-50 shadow-sm" : "bg-card hover:border-amber-400 hover:bg-amber-50/50"}`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex size-10 items-center justify-center rounded-xl ${selected ? "bg-amber-700 text-white" : "bg-stone-100 text-stone-600"}`}
                      >
                        <Icon className="size-5" />
                      </span>
                      <span>
                        <span className="block font-semibold text-stone-950">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-sm text-stone-500">
                          {option.description}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p
              className="mt-3 min-h-5 text-sm text-stone-500"
              aria-live="polite"
            >
              {savingPreference
                ? "Saving display preference…"
                : "Your choice applies to both song pages."}
            </p>
          </CardContent>
        </Card>
      </section>
      <div className="mt-6 flex gap-4">
        <form action="/api/auth/signout" method="post">
          <Button variant="outline">Sign out</Button>
        </form>
        <Link
          href="/songs"
          className="self-center text-sm font-semibold text-amber-800"
        >
          Browse songs
        </Link>
      </div>
    </main>
  );
}
