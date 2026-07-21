"use client";

import Image from "next/image";
import { Music2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { OwnerLabelProps, Tier, TierBadgeProps } from "@/types";

export const tierStyles: Record<Tier, string> = {
  S: "bg-violet-100 text-violet-800",
  A: "bg-sky-100 text-sky-800",
  B: "bg-lime-100 text-lime-800",
  C: "bg-amber-100 text-amber-800",
  D: "bg-orange-100 text-orange-800",
  F: "bg-rose-100 text-rose-800",
};

export function TierBadge({ tier, tall = false }: TierBadgeProps) {
  return (
    <div
      className={`flex shrink-0 ${tall ? "flex-col items-end gap-1" : "items-center"}`}
      title={tier ? `Current rank: ${tier} tier` : "Past song"}
    >
      {tall ? (
        <span className="text-[0.625rem] font-semibold tracking-[0.12em] text-stone-400 uppercase">
          {tier ? "Current rank" : "Status"}
        </span>
      ) : null}
      <Badge
        variant={tier ? "default" : "outline"}
        className={`h-6 rounded-full px-2.5 font-mono text-[0.6875rem] font-bold ${tier ? tierStyles[tier] : "text-stone-500"}`}
      >
        {tier ? `${tier} tier` : "Past"}
      </Badge>
    </div>
  );
}

export function SongArtwork({
  trackId,
  title,
  size,
}: {
  trackId: string | null;
  title: string;
  size: "small" | "large";
}) {
  const [failed, setFailed] = useState(false);
  const dimensions: string = size === "large" ? "size-20" : "size-12";

  return (
    <div
      className={`relative ${dimensions} shrink-0 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-950/5`}
    >
      {trackId && !failed ? (
        <Image
          src={`/api/spotify/art/${trackId}`}
          alt={`Album art for ${title}`}
          fill
          sizes={size === "large" ? "80px" : "48px"}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex size-full items-center justify-center bg-linear-to-br from-amber-50 to-stone-100 text-amber-700/55">
          <Music2 className={size === "large" ? "size-7" : "size-4"} />
          <span className="sr-only">No album art available</span>
        </span>
      )}
    </div>
  );
}

export function OwnerLabel({ owner }: OwnerLabelProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-amber-900">
      <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      Held by {owner}
    </span>
  );
}
