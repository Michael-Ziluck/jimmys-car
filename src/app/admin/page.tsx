import { asc, eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/db";
import { songs, spotifyLinkSuggestions } from "@/db/schema";
import { approveSpotifySuggestion } from "./actions";

export default async function AdminPage() {
  const db: ReturnType<typeof getDb> = getDb();
  const suggestions: Array<{
    id: string;
    title: string;
    artistName: string | null;
    spotifyTrackId: string;
    createdAt: Date;
  }> = await db
    .select({
      id: spotifyLinkSuggestions.id,
      title: songs.title,
      artistName: songs.artistName,
      spotifyTrackId: spotifyLinkSuggestions.spotifyTrackId,
      createdAt: spotifyLinkSuggestions.createdAt,
    })
    .from(spotifyLinkSuggestions)
    .innerJoin(songs, eq(spotifyLinkSuggestions.songId, songs.id))
    .where(eq(spotifyLinkSuggestions.status, "pending"))
    .orderBy(asc(spotifyLinkSuggestions.createdAt));
  return (
    <>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-stone-950">
          Song review
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Approve submitted Spotify matches before they appear on songs.
        </p>
      </div>
      <Card className="mt-6 overflow-hidden rounded-2xl py-0">
        <CardHeader className="border-b py-5">
          <CardTitle>Pending suggestions</CardTitle>
          <CardDescription>
            {suggestions.length} awaiting review
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {suggestions.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Song</TableHead>
                  <TableHead>Spotify match</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((suggestion) => (
                  <TableRow key={suggestion.id}>
                    <TableCell>
                      <p className="font-medium text-stone-950">
                        {suggestion.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.artistName ?? "Artist not linked"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {suggestion.spotifyTrackId}
                      </Badge>
                      <a
                        className="ml-3 text-sm font-medium text-amber-800 underline-offset-4 hover:underline"
                        href={`https://open.spotify.com/track/${suggestion.spotifyTrackId}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    </TableCell>
                    <TableCell className="text-right">
                      <form
                        action={approveSpotifySuggestion.bind(
                          null,
                          suggestion.id,
                        )}
                      >
                        <Button type="submit" size="sm">
                          Approve
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-10 text-center">
              <p className="font-semibold text-stone-900">All caught up</p>
              <p className="mt-2 text-sm text-muted-foreground">
                New song suggestions will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
