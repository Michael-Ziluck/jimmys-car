import { getSongHistoryPage } from "@/data/song-history";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query: string = searchParams.get("q")?.trim() ?? "";
  const requestedPage: number = Number.parseInt(searchParams.get("page") ?? "1", 10);
  return Response.json(
    await getSongHistoryPage(
      query,
      Number.isFinite(requestedPage) ? requestedPage : 1,
    ),
    { headers: { "Cache-Control": "no-store" } },
  );
}
