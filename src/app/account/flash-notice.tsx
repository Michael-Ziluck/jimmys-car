"use client";

import { useEffect } from "react";
import type { FlashNoticeProps } from "@/types";

export function FlashNotice({ message, kind }: FlashNoticeProps) {
  useEffect(() => {
    void fetch("/api/auth/flash", { method: "POST" });
  }, []);

  return (
    <p
      className={`mt-6 rounded-xl border p-4 text-sm ${kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-red-200 bg-red-50 text-red-800"}`}
    >
      {message}
    </p>
  );
}
