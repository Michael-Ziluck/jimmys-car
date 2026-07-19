import { assignSpotifyMatchRecord } from "@/lib/admin-matches";

interface AssignMatchRequest {
  songId?: unknown;
  spotifyTrackId?: unknown;
  artistName?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: AssignMatchRequest = (await request.json()) as AssignMatchRequest;
    if (
      typeof body.songId !== "string" ||
      typeof body.spotifyTrackId !== "string" ||
      typeof body.artistName !== "string"
    )
      return Response.json(
        { error: "A song, Spotify track, and artist are required." },
        { status: 400 },
      );

    await assignSpotifyMatchRecord(body.songId, body.spotifyTrackId, body.artistName);
    return Response.json({ ok: true });
  } catch (reason: unknown) {
    const message: string =
      reason instanceof Error ? reason.message : "The Spotify match could not be saved.";
    const status: number = message === "Administrator access required." ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
