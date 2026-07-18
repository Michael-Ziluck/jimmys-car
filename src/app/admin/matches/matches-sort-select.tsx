"use client";

import { ArrowDownAZ } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MatchesSortSelect({ value }: { value: "song" | "time" }) {
  const pathname: string = usePathname();
  const router: ReturnType<typeof useRouter> = useRouter();
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-input bg-card p-1">
      <ArrowDownAZ className="ml-2 size-3.5 text-stone-500" aria-hidden="true" />
      <Select
        value={value}
        onValueChange={(nextValue) =>
          router.push(`${pathname}?sort=${nextValue}`)
        }
      >
        <SelectTrigger className="h-10 min-w-36 rounded-lg border-0 bg-transparent shadow-none focus-visible:ring-0" aria-label="Sort potential matches">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="time">Recently removed</SelectItem>
          <SelectItem value="song">Song name</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
