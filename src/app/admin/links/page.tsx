import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db";
import { appSettings } from "@/db/schema";
import type { ExtraLink } from "@/types";
import { updateExternalLinks } from "../actions";
import { LinksEditor } from "./links-editor";

function parseExtraLinks(value: string | undefined): Array<ExtraLink> {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is ExtraLink =>
          Boolean(
            item &&
            typeof item.label === "string" &&
            typeof item.url === "string",
          ),
        )
      : [];
  } catch {
    return [];
  }
}

export default async function AdminLinksPage() {
  const settings: Map<string, string> = new Map(
    (await getDb().select().from(appSettings)).map((setting) => [
      setting.key,
      setting.value,
    ]),
  );
  return (
    <>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-stone-950">
          Links
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Choose the destinations shown on the public Links page.
        </p>
      </div>
      <form action={updateExternalLinks} className="mt-6 grid gap-8">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Featured links</CardTitle>
            <CardDescription>
              These three destinations always appear as prominent cards.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="spreadsheet-url">Spreadsheet URL</Label>
              <Input
                id="spreadsheet-url"
                name="spreadsheet_url"
                type="url"
                required
                defaultValue={settings.get("spreadsheet_url")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="playlist-url">Spotify playlist URL</Label>
              <Input
                id="playlist-url"
                name="playlist_url"
                type="url"
                required
                defaultValue={settings.get("playlist_url")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rules-url">Rules URL</Label>
              <Input
                id="rules-url"
                name="rules_url"
                type="url"
                required
                defaultValue={settings.get("rules_url")}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent>
            <LinksEditor
              extraLinks={parseExtraLinks(settings.get("extra_links"))}
            />
          </CardContent>
        </Card>
        <Button type="submit" className="mt-2 w-fit">
          Save links
        </Button>
      </form>
    </>
  );
}
