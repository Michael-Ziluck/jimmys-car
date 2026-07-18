import type { WeeklyEdition } from "./database";

export interface WeeklyEditionSummary {
  id: WeeklyEdition["id"];
  editionDate: WeeklyEdition["editionDate"];
  isCanonical: WeeklyEdition["isCanonical"];
  activeSongCount: number;
}

export type EditionIdentity = Pick<WeeklyEdition, "id" | "editionDate">;
