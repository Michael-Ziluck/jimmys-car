import { getPotentialMatches, type PotentialMatchesResult } from "./data";
import { MatchesPage } from "./matches-page";

export default async function AdminMatchesPage({ searchParams }: PageProps<"/admin/matches">) {
  const params: Awaited<PageProps<"/admin/matches">["searchParams"]> = await searchParams;
  const requestedPage: number = Number(params["page"] ?? "1");
  const sort: "song" | "time" = params["sort"] === "time" ? "time" : "song";
  const result: PotentialMatchesResult = await getPotentialMatches("current", requestedPage, sort);
  return <MatchesPage scope="current" sort={sort} {...result} />;
}
