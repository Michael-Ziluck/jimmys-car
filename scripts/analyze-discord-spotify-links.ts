import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import type {
  DiscordDatabaseSong as SongRow,
  DiscordMessage,
  DiscordRateLimitResponse,
  DiscordSongMatch,
  DiscordSongUpdate,
  SpotifyTrack as DiscordTrack,
} from "@/types";
import { normalizeSongTitle, songTitleMatchKey } from "./song-title-matching";

const CHANNEL_ID: string = "846835164159541298";
const DISCORD_API: string = `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`;
const TRACK_URL: RegExp =
  /https?:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})/i;

function normalize(value: string): string {
  return normalizeSongTitle(value);
}

function wait(milliseconds: number): Promise<unknown> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchDiscord(url: URL, token: string): Promise<Response> {
  while (true) {
    const response: Response = await fetch(url, {
      headers: {
        Authorization: `Bot ${token}`,
        "User-Agent": "JimmyCarDiscordAnalyzer/0.1",
      },
    });
    if (response.status !== 429) return response;
    const rateLimit: DiscordRateLimitResponse =
      (await response.json()) as DiscordRateLimitResponse;
    await wait(Math.ceil((rateLimit.retry_after ?? 1) * 1000) + 100);
  }
}

async function fetchMessages(token: string): Promise<DiscordMessage[]> {
  const messages: DiscordMessage[] = [];
  let before: string | undefined;
  do {
    const url: URL = new URL(DISCORD_API);
    url.searchParams.set("limit", "100");
    if (before) url.searchParams.set("before", before);
    const response: Response = await fetchDiscord(url, token);
    if (!response.ok)
      throw new Error(
        `Discord returned ${response.status}: ${await response.text()}`,
      );
    const page: DiscordMessage[] = (await response.json()) as DiscordMessage[];
    messages.push(...page);
    before = page.at(-1)?.id;
    if (page.length < 100) break;
  } while (before);
  return messages;
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const discordToken: string | undefined = process.env["DISCORD_BOT_TOKEN"];
  const databaseUrl: string | undefined = process.env["DATABASE_URL"];
  if (!discordToken || !databaseUrl)
    throw new Error("DISCORD_BOT_TOKEN and DATABASE_URL are required.");

  const sql: ReturnType<typeof neon> = neon(databaseUrl);
  const [messages, rawSongRows] = await Promise.all([
    fetchMessages(discordToken),
    sql`select id, title, normalized_title, spotify_track_id from songs`,
  ]);
  const songRows: SongRow[] = rawSongRows as SongRow[];
  const tracks: DiscordTrack[] = [
    ...new Map(
      messages.flatMap((message) =>
        (message.embeds ?? []).flatMap((embed) => {
          const match: RegExpMatchArray | null | undefined =
            embed.url?.match(TRACK_URL);
          if (!match || embed.provider?.name !== "Spotify" || !embed.title)
            return [];
          const id: string | undefined = match[1];
          if (!id) return [];
          const artist: string =
            embed.description?.split(String.fromCharCode(183))[0]?.trim() ?? "";
          return [
            [
              id,
              { id, title: embed.title, artist } satisfies DiscordTrack,
            ] as const,
          ];
        }),
      ),
    ).values(),
  ];
  const songsByTitle: Map<string, SongRow[]> = new Map();
  for (const song of songRows) {
    const key: string = songTitleMatchKey(song.normalized_title);
    songsByTitle.set(key, [...(songsByTitle.get(key) ?? []), song]);
  }
  const exactMatches: DiscordSongMatch[] = tracks.flatMap((track) => {
    const candidates: SongRow[] =
      songsByTitle.get(songTitleMatchKey(normalize(track.title))) ?? [];
    const song: SongRow | undefined =
      candidates.length === 1 ? candidates[0] : undefined;
    return song ? [{ song, track }] : [];
  });
  const unresolvedExactMatches: DiscordSongMatch[] = exactMatches.filter(
    ({ song }) => !song.spotify_track_id,
  );
  const conflictingExactMatches: DiscordSongMatch[] = exactMatches.filter(
    ({ song, track }) =>
      song.spotify_track_id && song.spotify_track_id !== track.id,
  );
  const unresolvedBySong: Map<string, DiscordSongMatch[]> = new Map();
  for (const match of unresolvedExactMatches) {
    unresolvedBySong.set(match.song.id, [
      ...(unresolvedBySong.get(match.song.id) ?? []),
      match,
    ]);
  }
  const singleTrackMatches: DiscordSongMatch[][] = [
    ...unresolvedBySong.values(),
  ].filter(
    (matches) => new Set(matches.map(({ track }) => track.id)).size === 1,
  );
  const multipleTrackMatches: DiscordSongMatch[][] = [
    ...unresolvedBySong.values(),
  ].filter((matches) => new Set(matches.map(({ track }) => track.id)).size > 1);
  const updates: DiscordSongUpdate[] = singleTrackMatches.flatMap((matches) => {
    const firstMatch: DiscordSongMatch | undefined = matches[0];
    return firstMatch
      ? [
          {
            id: firstMatch.song.id,
            spotify_track_id: firstMatch.track.id,
            artist_name: firstMatch.track.artist || null,
          },
        ]
      : [];
  });
  const apply: boolean = process.argv.includes("--apply");
  const applied: unknown[] = (
    apply && updates.length
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
      : []
  ) as unknown[];

  console.log(
    JSON.stringify(
      {
        messages: messages.length,
        messagesWithTrackLinks: messages.filter((message) =>
          TRACK_URL.test(message.content),
        ).length,
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
          const firstMatch: DiscordSongMatch | undefined = matches[0];
          return firstMatch
            ? [
                {
                  spreadsheetTitle: firstMatch.song.title,
                  trackId: firstMatch.track.id,
                  spotifyTitle: firstMatch.track.title,
                  artist: firstMatch.track.artist,
                },
              ]
            : [];
        }),
      },
      null,
      2,
    ),
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
