import { getCurrentSongs } from "@/data/song-history";

export async function GET(): Promise<Response> {
  return Response.json(await getCurrentSongs(), { headers: { "Cache-Control": "no-store" } });
}
