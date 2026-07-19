"use client";

import { usePathname, useRouter } from "next/navigation";

import { SortDropdown } from "@/components/sort-dropdown";

export function MatchesSortSelect({ value }: { value: "song" | "time" }) {
  const pathname: string = usePathname();
  const router: ReturnType<typeof useRouter> = useRouter();
  return (
    <SortDropdown<"song" | "time">
      value={value}
      onValueChange={(nextValue) =>
        router.push(`${pathname}?sort=${nextValue}`)
      }
      ariaLabel="Sort potential matches"
      options={[
        { value: "time", label: "Recently removed" },
        { value: "song", label: "Song name" },
      ]}
    />
  );
}
