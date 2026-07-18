import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SongView } from "./song-results";

export function SongResultsSkeleton({ view = "cards" }: { view?: SongView }) {
  if (view === "list") {
    return (
      <Card
        className="mt-4 overflow-hidden rounded-2xl py-0"
        aria-label="Loading songs"
      >
        <CardContent className="divide-y p-0">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-center gap-4 p-5 sm:px-6">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="hidden h-8 w-20 sm:block" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Loading songs"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index} className="min-h-44 rounded-2xl">
          <CardHeader className="flex-row items-start justify-between">
            <div className="w-2/3 space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="size-12 rounded-xl" />
          </CardHeader>
          <CardContent className="space-y-5">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
