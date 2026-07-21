import {
  getParticipantOptions,
  getSongHistoryPage,
} from "@/data/song-history";
import { getCurrentUser } from "@/lib/auth";
import type { AppUser, SongHistoryResult } from "@/types";

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
  const requestedSort: string | null = searchParams.get("sort");
  const sortField: "song" | "artist" | "time" =
    requestedSort === "song" || requestedSort === "artist"
      ? requestedSort
      : "time";
  const [history, user] = await Promise.all([
    getSongHistoryPage(
      query,
      Number.isFinite(requestedPage) ? requestedPage : 1,
      useRegex,
      searchField,
      sortField,
    ),
    getCurrentUser(),
  ]);
  const currentUser: AppUser | null = user;
  const result: SongHistoryResult = {
    ...history,
    isAdmin: currentUser?.role === "admin",
    owners:
      currentUser?.role === "admin" ? await getParticipantOptions() : [],
  };
  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
