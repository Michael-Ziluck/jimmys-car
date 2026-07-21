import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingSongPage() {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10 sm:py-16"
    >
      <Skeleton className="h-5 w-28" />
      <div className="mt-5 flex items-center gap-4">
        <Skeleton className="size-20 rounded-xl" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-64 max-w-[70vw]" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-8 h-80 rounded-2xl" />
    </main>
  );
}
