import "server-only";

function directSpotifyTrackId(value: string): string | undefined {
  const trimmedValue: string = value.trim();
  if (/^[A-Za-z0-9]{22}$/.test(trimmedValue)) return trimmedValue;

  const uriMatch: RegExpMatchArray | null = trimmedValue.match(
    /^spotify:track:([A-Za-z0-9]{22})$/i,
  );
  if (uriMatch) return uriMatch[1];

  try {
    const url: URL = new URL(trimmedValue);
    const pathMatch: RegExpMatchArray | null = url.pathname.match(
      /^\/(?:intl-[^/]+\/)?track\/([A-Za-z0-9]{22})(?:\/|$)/i,
    );
    if (url.hostname === "open.spotify.com" && pathMatch) return pathMatch[1];
  } catch {
    // The caller returns the user-facing validation message.
  }
  return undefined;
}

export async function parseSpotifyTrackId(
  value: string,
): Promise<string | undefined> {
  const directTrackId: string | undefined = directSpotifyTrackId(value);
  if (directTrackId) return directTrackId;

  try {
    const url: URL = new URL(value.trim());
    if (url.hostname !== "spotify.link") return undefined;
    const response: Response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
    });
    return directSpotifyTrackId(response.url);
  } catch {
    return undefined;
  }
}
