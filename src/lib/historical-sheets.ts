import type { HistoricalSheetSource } from "@/types";

export const HISTORICAL_SHEET_SOURCES: readonly HistoricalSheetSource[] = [
  {
    id: "1kps38iLua4rAnt3fhQN8if04luDoMf5YAW-TMUAQQuI",
    title: "Jimmy's Car Tier List (first 2 years)",
    latestEditionDate: "2021-09-26",
    priority: 1,
  },
  {
    id: "1AsrZ6pgHEYXpRiVACsDrVeb8-RJ0aacQgOLw9DDKWoc",
    title: "Jimmy's Car Tier List (years 3 and 4)",
    latestEditionDate: "2023-07-09",
    priority: 2,
  },
  {
    id: "1rNFNA7zWeLhjx3iiqM-siFY_Yd-zPjWF2n6EDVRomSQ",
    title: "Jimmy's Car Tier List (years 5 and 6)",
    latestEditionDate: "2025-06-22",
    priority: 3,
  },
  {
    id: "1twFFgFkUlMmHNAQ2FCKvbmIOy8xilINlV6Pk4HRhkS8",
    title: "Jimmy's Car Tier List (years 7 and 8)",
    latestEditionDate: "2026-07-19",
    latestSheetGid: "816189057",
    priority: 4,
  },
] as const;
