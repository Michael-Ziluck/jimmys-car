import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";

type DiscordMessage = {
  id: string;
  content: string;
  embeds?: Array<{ url?: string; title?: string; description?: string; provider?: { name?: string } }>;
};
type DiscordTrack = { id: string; title: string; artist: string };
type SongRow = { id: string; title: string; normalized_title: string; spotify_track_id: string | null };

const CHANNEL_ID: string = "846835164159541298";
const DISCORD_API: string = `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`;
const TRACK_URL: RegExp = /https?:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})/i;

function normalize(value: string) : string {
  return value.trim().replace(/\s+/g, " ").replace(/[\u2018\u2019]/g, "'").toLocaleLowerCase("en-US");
}

function wait(milliseconds: number) : Promise<unknown> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchDiscord(url: URL, token: string) : Promise<Response> {
  while (true) {
    const response: Response = await fetch(url, { headers: { Authorization: `Bot ${token}`, "User-Agent": "JimmyCarDiscordAnalyzer/0.1" } });
    if (response.status !== 429) return response;
    const rateLimit: { retry_after?: number; } = await response.json() as { retry_after?: number };
    await wait(Math.ceil((rateLimit.retry_after ?? 1) * 1000) + 100);
  }
}

async function fetchMessages(token: string) : Promise<DiscordMessage[]> {
  const messages: DiscordMessage[] = [];
  let before: string | undefined;
  do {
    const url: URL = new URL(DISCORD_API);
    url.searchParams.set("limit", "100");
    if (before) url.searchParams.set("before", before);
    const response: Response = await fetchDiscord(url, token);
    if (!response.ok) throw new Error(`Discord returned ${response.status}: ${await response.text()}`);
    const page: DiscordMessage[] = await response.json() as DiscordMessage[];
    messages.push(...page);
    before = page.at(-1)?.id;
    if (page.length < 100) break;
  } while (before);
  return messages;
}

async function main() : Promise<void> {
  loadEnvConfig(process.cwd());
  const discordToken: string | undefined = process.env["DISCORD_BOT_TOKEN"];
  const databaseUrl: string | undefined = process.env["DATABASE_URL"];
  if (!discordToken || !databaseUrl) throw new Error("DISCORD_BOT_TOKEN and DATABASE_URL are required.");

  const sql: ReturnType<typeof neon> = neon(databaseUrl);
  const [messages, rawSongRows] = await Promise.all([
    fetchMessages(discordToken),
    sql`select id, title, normalized_title, spotify_track_id from songs`,
  ]);
  const songRows: SongRow[] = rawSongRows as SongRow[];
  const tracks: { id: string; title: string; artist: string; }[] = [...new Map(messages.flatMap((message) => (message.embeds ?? []).flatMap((embed) => {
    const match: RegExpMatchArray | null | undefined = embed.url?.match(TRACK_URL);
    if (!match || embed.provider?.name !== "Spotify" || !embed.title) return [];
    const id: string | undefined = match[1];
    if (!id) return [];
    const artist: string = embed.description?.split(String.fromCharCode(183))[0]?.trim() ?? "";
    return [[id, { id, title: embed.title, artist } satisfies DiscordTrack] as const];
  }))).values()];
  const songsByTitle: Map<string, SongRow> = new Map(songRows.map((song) => [song.normalized_title, song]));
  const exactMatches: { song: SongRow; track: { id: string; title: string; artist: string; }; }[] = tracks.flatMap((track) => {
    const song: SongRow | undefined = songsByTitle.get(normalize(track.title));
    return song ? [{ song, track }] : [];
  });
  const unresolvedExactMatches: { song: SongRow; track: { id: string; title: string; artist: string; }; }[] = exactMatches.filter(({ song }) => !song.spotify_track_id);
  const conflictingExactMatches: { song: SongRow; track: { id: string; title: string; artist: string; }; }[] = exactMatches.filter(({ song, track }) => song.spotify_track_id && song.spotify_track_id !== track.id);
  const unresolvedBySong: Map<string, { song: SongRow; track: { id: string; title: string; artist: string; }; }[]> = new Map<string, typeof unresolvedExactMatches>();
  for (const match of unresolvedExactMatches) {
    unresolvedBySong.set(match.song.id, [...(unresolvedBySong.get(match.song.id) ?? []), match]);
  }
  const singleTrackMatches: { song: SongRow; track: { id: string; title: string; artist: string; }; }[][] = [...unresolvedBySong.values()].filter(
    (matches) => new Set(matches.map(({ track }) => track.id)).size === 1,
  );
  const multipleTrackMatches: { song: SongRow; track: { id: string; title: string; artist: string; }; }[][] = [...unresolvedBySong.values()].filter(
    (matches) => new Set(matches.map(({ track }) => track.id)).size > 1,
  );
  const updates: { id: string; spotify_track_id: string; artist_name: string | null; }[] = singleTrackMatches.flatMap((matches) => {
    const firstMatch: { song: SongRow; track: { id: string; title: string; artist: string; }; } | undefined = matches[0];
    return firstMatch ? [{
      id: firstMatch.song.id,
      spotify_track_id: firstMatch.track.id,
      artist_name: firstMatch.track.artist || null,
    }] : [];
  });
  const apply: boolean = process.argv.includes("--apply");
  const applied: unknown[] = (apply && updates.length
    ? await sql`
      update songs as song
      set spotify_track_id = update_rows.spotify_track_id,
          artist_name = update_rows.artist_name
      from jsonb_to_recordset(${JSON.stringify(updates)}::jsonb)
        as update_rows(id text, spotify_track_id text, artist_name text)
      where song.id = update_rows.id
        and song.spotify_track_id is null
      returning song.id
    `
    : []) as unknown[];

  console.log(JSON.stringify({
    messages: messages.length,
    messagesWithTrackLinks: messages.filter((message) => TRACK_URL.test(message.content)).length,
    uniqueTrackIds: tracks.length,
    spreadsheetTitles: songRows.length,
    exactTitleMatches: exactMatches.length,
    unresolvedExactTitleMatches: unresolvedExactMatches.length,
    unresolvedSpreadsheetTitlesWithExactMatch: unresolvedBySong.size,
    safeSingleTrackTitleMatches: singleTrackMatches.length,
    ambiguousMultiTrackTitleMatches: multipleTrackMatches.length,
    conflictsWithExistingLink: conflictingExactMatches.length,
    applied: applied.length,
    samples: singleTrackMatches.slice(0, 12).flatMap((matches) => {
      const firstMatch: { song: SongRow; track: { id: string; title: string; artist: string; }; } | undefined = matches[0];
      return firstMatch ? [{
        spreadsheetTitle: firstMatch.song.title,
        trackId: firstMatch.track.id,
        spotifyTitle: firstMatch.track.title,
        artist: firstMatch.track.artist,
      }] : [];
    }),
  }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
