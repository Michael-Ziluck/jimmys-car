import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";

type DiscordMessage = {
  id: string;
  content: string;
  embeds?: Array<{ url?: string; title?: string; description?: string; provider?: { name?: string } }>;
};
type DiscordTrack = { id: string; title: string; artist: string };
type SongRow = { id: string; title: string; normalized_title: string; spotify_track_id: string | null };

const CHANNEL_ID = "846835164159541298";
const DISCORD_API = `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`;
const TRACK_URL = /https?:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})/i;

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").replace(/[\u2018\u2019]/g, "'").toLocaleLowerCase("en-US");
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchDiscord(url: URL, token: string) {
  while (true) {
    const response = await fetch(url, { headers: { Authorization: `Bot ${token}`, "User-Agent": "JimmyCarDiscordAnalyzer/0.1" } });
    if (response.status !== 429) return response;
    const rateLimit = await response.json() as { retry_after?: number };
    await wait(Math.ceil((rateLimit.retry_after ?? 1) * 1000) + 100);
  }
}

async function fetchMessages(token: string) {
  const messages: DiscordMessage[] = [];
  let before: string | undefined;
  do {
    const url = new URL(DISCORD_API);
    url.searchParams.set("limit", "100");
    if (before) url.searchParams.set("before", before);
    const response = await fetchDiscord(url, token);
    if (!response.ok) throw new Error(`Discord returned ${response.status}: ${await response.text()}`);
    const page = await response.json() as DiscordMessage[];
    messages.push(...page);
    before = page.at(-1)?.id;
    if (page.length < 100) break;
  } while (before);
  return messages;
}

async function main() {
  loadEnvConfig(process.cwd());
  const discordToken = process.env.DISCORD_BOT_TOKEN;
  const databaseUrl = process.env.DATABASE_URL;
  if (!discordToken || !databaseUrl) throw new Error("DISCORD_BOT_TOKEN and DATABASE_URL are required.");

  const sql = neon(databaseUrl);
  const [messages, rawSongRows] = await Promise.all([
    fetchMessages(discordToken),
    sql`select id, title, normalized_title, spotify_track_id from songs`,
  ]);
  const songRows = rawSongRows as SongRow[];
  const tracks = [...new Map(messages.flatMap((message) => (message.embeds ?? []).flatMap((embed) => {
    const match = embed.url?.match(TRACK_URL);
    if (!match || embed.provider?.name !== "Spotify" || !embed.title) return [];
    const id = match[1];
    const artist = embed.description?.split(String.fromCharCode(183))[0]?.trim() ?? "";
    return [[id, { id, title: embed.title, artist } satisfies DiscordTrack] as const];
  }))).values()];
  const songsByTitle = new Map(songRows.map((song) => [song.normalized_title, song]));
  const exactMatches = tracks.flatMap((track) => {
    const song = songsByTitle.get(normalize(track.title));
    return song ? [{ song, track }] : [];
  });
  const unresolvedExactMatches = exactMatches.filter(({ song }) => !song.spotify_track_id);
  const conflictingExactMatches = exactMatches.filter(({ song, track }) => song.spotify_track_id && song.spotify_track_id !== track.id);
  const unresolvedBySong = new Map<string, typeof unresolvedExactMatches>();
  for (const match of unresolvedExactMatches) {
    unresolvedBySong.set(match.song.id, [...(unresolvedBySong.get(match.song.id) ?? []), match]);
  }
  const singleTrackMatches = [...unresolvedBySong.values()].filter(
    (matches) => new Set(matches.map(({ track }) => track.id)).size === 1,
  );
  const multipleTrackMatches = [...unresolvedBySong.values()].filter(
    (matches) => new Set(matches.map(({ track }) => track.id)).size > 1,
  );
  const updates = singleTrackMatches.map(([{ song, track }]) => ({
    id: song.id,
    spotify_track_id: track.id,
    artist_name: track.artist || null,
  }));
  const apply = process.argv.includes("--apply");
  const applied = apply && updates.length
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
    : [];

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
    samples: singleTrackMatches.slice(0, 12).map(([{ song, track }]) => ({
      spreadsheetTitle: song.title,
      trackId: track.id,
      spotifyTitle: track.title,
      artist: track.artist,
    })),
  }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
