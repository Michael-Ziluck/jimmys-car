import { getSongHistoryPage } from "@/data/song-history";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query: string = searchParams.get("q")?.trim() ?? "";
  const requestedPage: number = Number.parseInt(
    searchParams.get("page") ?? "1",
    10,
  );
  const useRegex: boolean = searchParams.get("regex") === "1";
  const searchField: "song" | "artist" =
    searchParams.get("field") === "artist" ? "artist" : "song";
  const sortField: "song" | "artist" =
    searchParams.get("sort") === "artist" ? "artist" : "song";
  return Response.json(
    await getSongHistoryPage(
      query,
      Number.isFinite(requestedPage) ? requestedPage : 1,
      useRegex,
      searchField,
      sortField,
    ),
    { headers: { "Cache-Control": "no-store" } },
  );
}
