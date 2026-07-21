import { getParticipantOptions, getSongDetail } from "@/data/song-history";
import { getCurrentUser } from "@/lib/auth";
import type { AppUser, SongDetail, SongDetailResult } from "@/types";

interface SongRouteContext {
  params: Promise<{ songId: string }>;
}

export async function GET(
  _request: Request,
  { params }: SongRouteContext,
): Promise<Response> {
  const { songId } = await params;
  const [song, user]: [SongDetail | null, AppUser | null] = await Promise.all([
    getSongDetail(songId),
    getCurrentUser(),
  ]);
  if (!song)
    return Response.json({ error: "Song not found." }, { status: 404 });

  const isAdmin: boolean = user?.role === "admin";
  const result: SongDetailResult = {
    song,
    isAdmin,
    owners: isAdmin ? await getParticipantOptions() : [],
  };

  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
