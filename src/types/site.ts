export interface ExtraLink {
  label: string;
  url: string;
}

export interface EditableLink extends ExtraLink {
  id: string;
}

export interface LinksEditorProps {
  extraLinks: ExtraLink[];
}

export interface NavigationLink {
  href: string;
  label: string;
  admin?: boolean;
}

export interface AppNavigationLink extends NavigationLink {
  match: (pathname: string) => boolean;
}

export interface AppNavProps {
  isAdmin: boolean;
}

export interface LayoutProps {
  children: ReactNode;
}

export interface ProxyMatcherConfig {
  matcher: string;
}

export interface PendingSpotifySuggestion {
  id: string;
  title: string;
  artistName: string | null;
  spotifyTrackId: string;
  createdAt: Date;
}

export interface UnclaimedParticipantProfile {
  id: string;
  displayName: string;
  spotifyAccountId: string | null;
}
import type { ReactNode } from "react";
