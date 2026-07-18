import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import { appSettings } from "@/db/schema";
import type { ExtraLink } from "@/types";

export default async function LinksPage() {
  const links: Map<string, string> = new Map(
    (await getDb().select().from(appSettings)).map((setting) => [
      setting.key,
      setting.value,
    ]),
  );
  let extraLinks: ExtraLink[] = [];
  try {
    const parsed: unknown = JSON.parse(links.get("extra_links") ?? "[]");
    extraLinks = Array.isArray(parsed)
      ? parsed.filter((item): item is ExtraLink =>
          Boolean(
            item &&
            typeof item.label === "string" &&
            typeof item.url === "string",
          ),
        )
      : [];
  } catch {
    extraLinks = [];
  }
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-10 sm:py-16"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
        Jimmy&apos;s Car
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950">
        Links
      </h1>
      <p className="mt-4 text-stone-600">
        Everything the group uses, in one place.
      </p>
      <section aria-labelledby="featured-links" className="mt-8">
        <h2 id="featured-links" className="sr-only">
          Featured links
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              key: "spreadsheet_url",
              title: "Tier spreadsheet",
              description: "View the current list and weekly history.",
            },
            {
              key: "playlist_url",
              title: "Spotify playlist",
              description: "Listen to the active Jimmy's Car songs.",
            },
          ].map((item) => (
            <Card key={item.key} className="rounded-2xl">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild disabled={!links.get(item.key)}>
                  <a
                    href={links.get(item.key) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open <ExternalLink className="size-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      {extraLinks.length ? (
        <section aria-labelledby="more-links" className="mt-10">
          <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
            <h2
              id="more-links"
              className="text-xl font-bold tracking-tight text-stone-950"
            >
              More from Jimmy&apos;s Car
            </h2>
            <span className="text-sm text-muted-foreground">
              {extraLinks.length} {extraLinks.length === 1 ? "link" : "links"}
            </span>
          </div>
          <div className="divide-y divide-stone-200">
            {extraLinks.map((link) => (
              <a
                key={`${link.label}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="group flex min-h-14 items-center justify-between gap-4 py-4 font-semibold text-stone-800 outline-none transition-colors hover:text-amber-800 focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span>{link.label}</span>
                <ExternalLink className="size-4 text-stone-400 transition-colors group-hover:text-amber-700" />
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
