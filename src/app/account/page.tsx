"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AccountData = {
  user: {
    discordUsername: string;
    discordDisplayName: string | null;
    spotifyAccountId: string | null;
    spotifyDisplayName: string | null;
  } | null;
  claimedParticipant: { displayName: string } | null;
  claimableParticipants: Array<{ id: string; displayName: string }>;
};

export default function AccountPage() {
  const [data, setData] = useState<AccountData | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () =>
    void fetch("/api/account", { cache: "no-store" })
      .then((response) => response.json() as Promise<AccountData>)
      .then(setData);
  useEffect(load, []);

  const update = (body: object) =>
    void fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (response) => {
      const result: { error?: string } = (await response.json()) as { error?: string };
      setMessage(result.error ?? (response.ok ? "Saved." : "Could not save."));
      if (response.ok) load();
    });

  if (!data)
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-10 sm:py-16">
        <p className="text-sm text-stone-500">Loading profile…</p>
      </main>
    );
  if (!data.user)
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:px-10 sm:py-16">
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
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-10 sm:py-16">
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
