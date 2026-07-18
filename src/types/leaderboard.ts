import type { Participant, Tier, WeeklyEdition } from "./database";

export interface LeaderboardEntry {
  participantId: Participant["id"];
  name: Participant["displayName"];
  points: number;
  change: number;
  songs: number;
  average: number;
  rank: number;
}

export interface Leaderboard {
  editionDate: WeeklyEdition["editionDate"];
  previousEditionDate: WeeklyEdition["editionDate"] | null;
  entries: LeaderboardEntry[];
}

export interface ScoredAppearance {
  editionId: WeeklyEdition["id"];
  participantId: Participant["id"];
  tier: Tier;
}

export interface ParticipantScore {
  points: number;
  songs: number;
}

export interface ScoringRule {
  tier: Tier;
  points: string;
}

export interface ScoreChangeProps {
  value: number;
}

export interface LeaderboardParticipant {
  id: Participant["id"];
  name: Participant["displayName"];
}
