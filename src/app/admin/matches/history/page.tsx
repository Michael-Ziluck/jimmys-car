import { getPotentialMatches, type PotentialMatchesResult } from "../data";
import { MatchesPage } from "../matches-page";

export default async function AdminMatchHistoryPage({ searchParams }: PageProps<"/admin/matches/history">) {
  const params: Awaited<PageProps<"/admin/matches/history">["searchParams"]> = await searchParams;
  const requestedPage: number = Number(params["page"] ?? "1");
  const sort: "song" | "time" = params["sort"] === "song" ? "song" : "time";
  const result: PotentialMatchesResult = await getPotentialMatches("history", requestedPage, sort);
  return <MatchesPage scope="history" sort={sort} {...result} />;
}
