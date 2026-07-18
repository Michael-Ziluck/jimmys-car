import type { Participant } from "./database";

export interface ParticipantSummary {
  id: Participant["id"];
  displayName: Participant["displayName"];
  columnColor: Participant["columnColor"];
  activeSongCount: number;
}

export type ParticipantIdentity = Pick<Participant, "id" | "displayName">;
