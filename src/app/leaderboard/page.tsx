import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getLeaderboard } from "@/data/leaderboard";
import type { LeaderboardEntry, ScoreChangeProps, ScoringRule } from "@/types";
import { cn } from "@/lib/utils";

const scoring: ScoringRule[] = [
  { tier: "S", points: "+4" },
  { tier: "A", points: "+2" },
  { tier: "B", points: "+1" },
  { tier: "C", points: "0" },
  { tier: "D", points: "−1" },
  { tier: "F", points: "−3" },
];

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function Change({ value }: ScoreChangeProps) {
  const Icon: LucideIcon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-xs font-semibold",
        value > 0 && "text-emerald-700",
        value < 0 && "text-rose-700",
        value === 0 && "text-stone-400",
      )}
    >
      <Icon className="size-3" />
      {value === 0 ? "0" : Math.abs(value)}
    </span>
  );
}

export default async function LeaderboardPage() {
  const leaderboard: Awaited<ReturnType<typeof getLeaderboard>> =
    await getLeaderboard();
  const leaders: Array<LeaderboardEntry> =
    leaderboard?.entries.slice(0, 3) ?? [];
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10 sm:py-16"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
        Jimmy&apos;s Car
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950">
        Leaderboard
      </h1>
      <p className="mt-4 max-w-2xl text-stone-600">
        Scores from the latest tier list. Strong placements add points; D and F
        placements take them away.
      </p>
      {leaderboard ? (
        <>
          <div
            className="mt-8 flex flex-wrap items-center gap-2"
            aria-label="Scoring rules"
          >
            {scoring.map((item) => (
              <Badge
                key={item.tier}
                variant="outline"
                className="gap-1.5 rounded-full bg-white px-3 py-1.5"
              >
                <span className="font-bold">{item.tier}</span>
                <span className="font-mono text-muted-foreground">
                  {item.points}
                </span>
              </Badge>
            ))}
          </div>
          <section
            aria-label="Current leaders"
            className="mt-8 grid gap-4 sm:grid-cols-3"
          >
            {leaders.map((entry, index) => (
              <Card
                key={entry.participantId}
                className={cn(
                  "rounded-2xl",
                  index === 0 && "bg-amber-50 ring-amber-700/20",
                )}
              >
                <CardContent className="flex items-end justify-between gap-4 p-5">
                  <div>
                    <p className="font-mono text-xs font-semibold uppercase tracking-widest text-stone-500">
                      #{entry.rank}
                    </p>
                    <h2 className="mt-2 text-lg font-bold text-stone-950">
                      {entry.name}
                    </h2>
                    <div className="mt-2">
                      <Change value={entry.change} />
                    </div>
                  </div>
                  <p className="font-mono text-4xl font-bold tracking-tighter text-stone-950">
                    {entry.points}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>
          <section aria-labelledby="standings-heading" className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2
                  id="standings-heading"
                  className="text-xl font-bold text-stone-950"
                >
                  Full standings
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {displayDate(leaderboard.editionDate)} edition
                </p>
              </div>
              <p className="text-right text-xs text-muted-foreground">
                Change compares with
                <br />
                the previous edition
              </p>
            </div>
            <Card className="gap-0 overflow-hidden rounded-2xl py-0">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-stone-50/70 hover:bg-stone-50/70">
                      <TableHead className="h-12 w-16 pl-5 sm:pl-6">
                        Rank
                      </TableHead>
                      <TableHead className="h-12">Person</TableHead>
                      <TableHead className="h-12 text-right">Points</TableHead>
                      <TableHead className="h-12 text-right">Change</TableHead>
                      <TableHead className="hidden h-12 text-right sm:table-cell">
                        Songs
                      </TableHead>
                      <TableHead className="hidden h-12 pr-5 text-right sm:table-cell sm:pr-6">
                        Average
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.entries.map((entry) => (
                      <TableRow
                        key={entry.participantId}
                        className="hover:bg-transparent"
                      >
                        <TableCell className="py-3.5 pl-5 font-mono text-muted-foreground sm:pl-6">
                          {entry.rank}
                        </TableCell>
                        <TableCell className="py-3.5 font-semibold text-stone-950">
                          {entry.name}
                        </TableCell>
                        <TableCell className="py-3.5 text-right font-mono font-bold">
                          {entry.points}
                        </TableCell>
                        <TableCell className="py-3.5 text-right">
                          <Change value={entry.change} />
                        </TableCell>
                        <TableCell className="hidden py-3.5 text-right font-mono text-muted-foreground sm:table-cell">
                          {entry.songs}
                        </TableCell>
                        <TableCell className="hidden py-3.5 pr-5 text-right font-mono text-muted-foreground sm:table-cell sm:pr-6">
                          {entry.average.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        </>
      ) : (
        <Card className="mt-8 rounded-2xl">
          <CardContent className="p-8 text-center text-muted-foreground">
            No scoring data has been imported yet.
          </CardContent>
        </Card>
      )}
    </main>
  );
}
