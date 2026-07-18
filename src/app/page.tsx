import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user: Awaited<ReturnType<typeof getCurrentUser>> =
    await getCurrentUser();
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-14 sm:px-10 sm:py-20"
    >
      <div className="max-w-3xl">
        <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
          July 19 edition · now playing
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-stone-950 sm:text-7xl">
          Jimmy&apos;s Car
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600 sm:text-xl">
          The shared record of what made the car, who holds it, and where every
          song landed.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="h-auto rounded-full px-6 py-3 text-base">
            <Link href="/songs">Search songs</Link>
          </Button>
          {user?.role === "admin" ? (
            <Button
              asChild
              variant="outline"
              className="h-auto rounded-full bg-card px-6 py-3 text-base"
            >
              <Link href="/admin">Admin</Link>
            </Button>
          ) : null}
          <Button
            asChild
            variant="outline"
            className="h-auto rounded-full bg-card px-6 py-3 text-base"
          >
            <Link href="/account">Your profile</Link>
          </Button>
        </div>
      </div>

      <div className="mt-14" aria-label="Tier scale">
        <div
          className="grid h-2 grid-cols-6 overflow-hidden rounded-full"
          aria-hidden="true"
        >
          <span className="bg-rose-400" />
          <span className="bg-orange-400" />
          <span className="bg-amber-400" />
          <span className="bg-lime-400" />
          <span className="bg-sky-400" />
          <span className="bg-violet-400" />
        </div>
        <div
          className="mt-2 grid grid-cols-6 font-mono text-[0.65rem] font-semibold text-stone-500"
          aria-hidden="true"
        >
          {["S", "A", "B", "C", "D", "F"].map((tier) => (
            <span key={tier}>{tier}</span>
          ))}
        </div>
      </div>

      <section
        className="mt-12 grid gap-px overflow-hidden rounded-2xl border bg-stone-200 shadow-sm sm:grid-cols-3"
        aria-label="Current week summary"
      >
        {[
          ["Edition", "July 19, 2026"],
          ["Library", "Current + history"],
          ["Access", "Public browsing"],
        ].map(([label, value]) => (
          <Card key={label} className="rounded-none border-0 py-0 shadow-none">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
