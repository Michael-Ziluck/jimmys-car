import type { AppUser, Participant, UserSession } from "./database";
import type { SongView } from "./songs";

export type CurrentUser = AppUser;
export type ThemePreference = "system" | "light" | "dark";

export interface AccountData {
  user:
    | (Pick<
        AppUser,
        | "discordUsername"
        | "discordDisplayName"
        | "spotifyAccountId"
        | "spotifyDisplayName"
      > & { songView: SongView; themePreference: ThemePreference })
    | null;
  claimedParticipant: Pick<Participant, "displayName"> | null;
  claimableParticipants: Array<Pick<Participant, "id" | "displayName">>;
}

export interface AccountUpdateRequest {
  action?: string;
  participantId?: string;
  songView?: SongView;
  themePreference?: ThemePreference;
}

export interface ApiErrorResponse {
  error?: string;
}

export type SessionIdentity = Pick<UserSession, "id" | "expiresAt">;

export interface SessionCookie {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    sameSite: "lax";
    secure: boolean;
    path: string;
    expires: Date;
  };
}

export interface FlashMessage {
  kind: "success" | "error";
  message: string;
}

export type FlashNoticeProps = FlashMessage;
