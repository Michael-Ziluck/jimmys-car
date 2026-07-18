import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-16 sm:px-10 sm:py-24">
      <div className="max-w-3xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
          Current week
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-stone-950 sm:text-7xl">
          Jimmy&apos;s Car
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600 sm:text-xl">
          A home for the songs, rankings, and history behind the weekly
          playlist.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="h-auto rounded-full px-6 py-3 text-base">
            <Link href="/songs">Search songs</Link>
          </Button>
          <Button asChild variant="outline" className="h-auto rounded-full bg-card px-6 py-3 text-base">
            <Link href="/admin">Admin preview</Link>
          </Button>
          <Button asChild variant="outline" className="h-auto rounded-full bg-card px-6 py-3 text-base">
            <Link href="/account">Your profile</Link>
          </Button>
        </div>
      </div>

      <section className="mt-20 grid gap-4 sm:grid-cols-3" aria-label="Current week summary">
        {[
          ["Edition", "July 19, 2026"],
          ["Songs", "10 demo tracks"],
          ["Status", "Local prototype"],
        ].map(([label, value]) => (
          <Card key={label} className="rounded-2xl py-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
