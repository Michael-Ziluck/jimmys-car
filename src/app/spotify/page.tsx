import Link from "next/link";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSpotifyRedirectUri } from "@/lib/spotify";

type ConnectedProfile = {
  id: string;
  displayName: string | null;
  imageUrl: string | null;
};

function readProfile(value: string | undefined): ConnectedProfile | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as ConnectedProfile;
  } catch {
    return null;
  }
}

export default async function SpotifyPage({
  searchParams,
}: PageProps<"/spotify">) {
  const { connected, error } = await searchParams;
  const profile = readProfile((await cookies()).get("spotify_profile")?.value);
  const signInUrl = new URL("/api/auth/spotify", new URL(getSpotifyRedirectUri()).origin).toString();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">Spotify</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950">Connect your account</h1>
      {error ? (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Spotify could not complete the connection: {error}.
        </p>
      ) : null}
      {connected && profile ? (
        <Card className="mt-8 rounded-2xl border-emerald-200 bg-emerald-50 py-0 text-emerald-950">
          <CardContent className="p-6">
            <p className="font-semibold">Spotify is connected.</p>
            <p className="mt-1">Signed in as {profile.displayName ?? profile.id}.</p>
            <p className="mt-4 text-sm">This is a local connection check only. Tokens are not yet persisted, and no Spotify playlist changes can be made.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-8 rounded-2xl py-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Connect Spotify to verify the integration and retrieve your basic profile.</p>
            <Button asChild className="mt-5 h-auto rounded-full bg-[#1ed760] px-6 py-3 text-base text-stone-950 hover:bg-[#1db954]">
              <a href={signInUrl}>Log in with Spotify</a>
            </Button>
          </CardContent>
        </Card>
      )}
      <Link href="/" className="mt-8 inline-block text-sm font-semibold text-amber-800 hover:text-amber-950">Back to Jimmy&apos;s Car</Link>
    </main>
  );
}
